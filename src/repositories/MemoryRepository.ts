import { db } from '../db';
import type { Memory } from '../types';

export const MemoryRepository = {
  async get(id: string): Promise<Memory | undefined> {
    return await db.memories.get(id);
  },

  async list(campaignId: string): Promise<Memory[]> {
    return await db.memories.where('campaignId').equals(campaignId).toArray();
  },

  async save(memory: Memory, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memories.get(memory.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Memory = {
      ...memory,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'memory',
        memory.id,
        isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        record,
        async () => {
          await db.memories.put(record);
        },
        async () => {
          if (existing) {
            await db.memories.put(existing);
          } else {
            await db.memories.delete(memory.id);
          }
        }
      );
    } else {
      await db.memories.put(record);
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memories.get(id);
    if (!existing) return;

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'memory',
        id,
        'DELETE',
        existing.version || 0,
        null,
        async () => {
          await db.memories.delete(id);
        },
        async () => {
          await db.memories.put(existing);
        }
      );
    } else {
      await db.memories.delete(id);
    }
  }
};
