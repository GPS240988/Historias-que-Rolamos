import { db } from '../db';
import type { Media } from '../types';

export const MediaRepository = {
  async get(id: string): Promise<Media | undefined> {
    return await db.media.get(id);
  },

  async list(campaignId: string): Promise<Media[]> {
    return await db.media.where('campaignId').equals(campaignId).toArray();
  },

  async save(media: Media, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.media.get(media.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Media = {
      ...media,
      version: baseVersion,
      createdAt: media.createdAt || new Date().toISOString()
    };

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'media',
        media.id,
        isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        record,
        async () => {
          await db.media.put(record);
        },
        async () => {
          if (existing) {
            await db.media.put(existing);
          } else {
            await db.media.delete(media.id);
          }
        }
      );
    } else {
      await db.media.put(record);
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.media.get(id);
    if (!existing) return;

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'media',
        id,
        'DELETE',
        existing.version || 0,
        null,
        async () => {
          await db.media.delete(id);
        },
        async () => {
          await db.media.put(existing);
        }
      );
    } else {
      await db.media.delete(id);
    }
  }
};
