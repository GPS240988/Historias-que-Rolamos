import { db } from '../db';
import type { Memory } from '../types';

export const MemoryRepository = {
  async get(id: string): Promise<Memory | undefined> {
    return await db.memories.get(id);
  },

  async list(campaignId: string): Promise<Memory[]> {
    return await db.memories.where('campaignId').equals(campaignId).toArray();
  },

  async save(memory: Memory, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memories.get(memory.id);
    const baseVersion = existing?.version || 0;

    const record: Memory = {
      ...memory,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    await db.memories.put(record);
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    await db.memories.delete(id);
  }
};

