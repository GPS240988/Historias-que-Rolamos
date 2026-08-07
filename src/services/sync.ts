import { db, ChronicleDatabase } from '../db';
import { SyncOutboxRepository } from '../repositories/SyncOutboxRepository';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getTableName(entityType: string): keyof ChronicleDatabase {
  const tableMap: Record<string, keyof ChronicleDatabase> = {
    campaign: 'campaigns',
    character: 'characters',
    memory: 'memories',
    memoryCharacter: 'memoryCharacters',
    token: 'tokens',
    media: 'media'
  };
  return tableMap[entityType];
}

export const SyncEngine = {
  isSyncing: false,
  listeners: new Set<(status: 'synced' | 'syncing' | 'pending' | 'conflict', error?: string) => void>(),

  subscribe(listener: (status: 'synced' | 'syncing' | 'pending' | 'conflict', error?: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  notify(status: 'synced' | 'syncing' | 'pending' | 'conflict', error?: string) {
    this.listeners.forEach(l => l(status, error));
  },

  async getStatus(): Promise<'synced' | 'syncing' | 'pending' | 'conflict'> {
    const conflicts = await SyncOutboxRepository.listConflicts();
    if (conflicts.length > 0) return 'conflict';
    const pending = await SyncOutboxRepository.listPending();
    if (pending.length > 0) return 'pending';
    return 'synced';
  },

  async triggerSync() {
    if (this.isSyncing) return;
    const token = localStorage.getItem('cloud_token');
    if (!token) {
      this.notify(await this.getStatus());
      return;
    }

    if (!navigator.onLine) {
      this.notify(await this.getStatus());
      return;
    }

    this.isSyncing = true;
    this.notify('syncing');

    try {
      // 1. Push pending changes
      await this.pushLocalChanges();

      // 2. Pull server updates
      const activeCampaignId = localStorage.getItem('activeCampaignId');
      if (activeCampaignId && activeCampaignId !== 'new') {
        await this.pullServerChanges(activeCampaignId);
      }

      const status = await this.getStatus();
      this.notify(status);
    } catch (err: any) {
      console.error('Sync failed:', err);
      const status = await this.getStatus();
      this.notify(status === 'conflict' ? 'conflict' : 'pending', err.message);
    } finally {
      this.isSyncing = false;
    }
  },

  async pushLocalChanges() {
    const token = localStorage.getItem('cloud_token');
    const pending = await SyncOutboxRepository.listPending();
    if (pending.length === 0) return;

    // Upload raw binaries to R2 first
    for (const item of pending) {
      if (item.entityType === 'media' && item.operation === 'CREATE') {
        await this.uploadMediaBinary(item.entityId);
      }
    }

    const mutations = pending.map(item => ({
      outboxId: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      baseVersion: item.baseVersion,
      payload: item.payload
    }));

    const response = await fetch(`${API_BASE_URL}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ mutations })
    });

    if (!response.ok) {
      throw new Error(`Server sync responded with status ${response.status}`);
    }

    const result = await response.json() as {
      success: boolean;
      results: Array<{
        outboxId: number;
        status: 'success' | 'conflict';
        serverVersion?: number;
        serverPayload?: any;
      }>;
    };

    await db.transaction('rw', [db.sync_outbox, db.campaigns, db.characters, db.memories, db.tokens, db.memoryCharacters, db.media], async () => {
      for (const res of result.results) {
        const outboxItem = await db.sync_outbox.get(res.outboxId);
        if (!outboxItem) continue;

        if (res.status === 'success') {
          if (outboxItem.operation !== 'DELETE') {
            const tableName = getTableName(outboxItem.entityType);
            const table = db[tableName];
            const localRecord = await (table as any).get(outboxItem.entityId);
            if (localRecord) {
              localRecord.version = res.serverVersion;
              await (table as any).put(localRecord);
            }
          }
          await db.sync_outbox.delete(res.outboxId);
        } else if (res.status === 'conflict') {
          await db.sync_outbox.update(res.outboxId, {
            status: 'conflict',
            serverVersion: res.serverVersion,
            serverPayload: res.serverPayload
          });
        }
      }
    });
  },

  async uploadMediaBinary(mediaId: string) {
    const token = localStorage.getItem('cloud_token');
    const record = await db.media.get(mediaId);
    if (!record) return;

    if (record.blob && record.blob.size > 0) {
      const res = await fetch(`${API_BASE_URL}/api/media/upload/${mediaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': record.mimeType,
          'Authorization': `Bearer ${token}`
        },
        body: record.blob
      });
      if (!res.ok) throw new Error(`Original upload failed with status ${res.status}`);
    }

    if (record.thumbnail && record.thumbnail.size > 0) {
      const res = await fetch(`${API_BASE_URL}/api/media/upload/${mediaId}_thumb`, {
        method: 'PUT',
        headers: {
          'Content-Type': record.mimeType,
          'Authorization': `Bearer ${token}`
        },
        body: record.thumbnail
      });
      if (!res.ok) throw new Error(`Thumbnail upload failed with status ${res.status}`);
    }
  },

  async pullServerChanges(campaignId: string) {
    const token = localStorage.getItem('cloud_token');
    const lastSyncStr = localStorage.getItem(`lastSyncSequence_${campaignId}`) || '0';
    const since = parseInt(lastSyncStr, 10);

    const res = await fetch(`${API_BASE_URL}/api/sync?campaignId=${campaignId}&since=${since}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch server changes: ${res.status}`);
    }

    const data = await res.json() as {
      serverSequence: number;
      changes: Array<{
        sequence: number;
        entityType: string;
        entityId: string;
        operation: 'CREATE' | 'UPDATE' | 'DELETE';
        version: number;
        payload: any;
      }>;
    };

    if (data.changes.length === 0) {
      localStorage.setItem(`lastSyncSequence_${campaignId}`, data.serverSequence.toString());
      return;
    }

    await db.transaction('rw', [db.campaigns, db.characters, db.memories, db.tokens, db.memoryCharacters, db.media, db.sync_outbox], async () => {
      for (const change of data.changes) {
        const outboxPending = await db.sync_outbox
          .where('entityId')
          .equals(change.entityId)
          .first();
        
        if (outboxPending) {
          continue;
        }

        const tableName = getTableName(change.entityType);
        const table = db[tableName];
        if (change.operation === 'DELETE') {
          await (table as any).delete(change.entityId);
        } else {
          let payload = { ...change.payload };
          
          if (change.entityType === 'media') {
            const existingMedia = await db.media.get(change.entityId);
            if (existingMedia && existingMedia.blob && existingMedia.blob.size > 0) {
              payload.blob = existingMedia.blob;
              payload.thumbnail = existingMedia.thumbnail;
            } else {
              try {
                const blobRes = await fetch(`${API_BASE_URL}/api/media/download/${change.entityId}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (blobRes.ok) {
                  payload.blob = await blobRes.blob();
                } else {
                  payload.blob = new Blob([], { type: change.payload.mimeType });
                }

                const thumbRes = await fetch(`${API_BASE_URL}/api/media/download/${change.entityId}_thumb`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (thumbRes.ok) {
                  payload.thumbnail = await thumbRes.blob();
                } else {
                  payload.thumbnail = payload.blob;
                }
              } catch (e) {
                console.warn('Failed to fetch media binaries for', change.entityId, e);
                payload.blob = new Blob([], { type: change.payload.mimeType });
                payload.thumbnail = payload.blob;
              }
            }
          }

          payload.version = change.version;
          await (table as any).put(payload);
        }
      }

      localStorage.setItem(`lastSyncSequence_${campaignId}`, data.serverSequence.toString());
    });
  }
};
