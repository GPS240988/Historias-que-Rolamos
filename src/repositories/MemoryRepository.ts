import { db } from '../db';
import type { Memory } from '../types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

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

    await db.memories.put(record);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'memory',
        entityId: memory.id,
        operation: isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        payload: record
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memories.get(id);
    if (!existing) return;

    await db.memories.delete(id);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'memory',
        entityId: id,
        operation: 'DELETE',
        baseVersion: existing.version || 0,
        payload: null
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  }
};
