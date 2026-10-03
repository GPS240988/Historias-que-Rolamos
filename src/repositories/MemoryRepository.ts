import { db } from '../db';
import type { Memory } from '../types';
import { VersionControlService } from '../services/versionControl';

export const MemoryRepository = {
  async get(id: string): Promise<Memory | undefined> {
    return await db.memories.get(id);
  },

  async list(campaignId: string): Promise<Memory[]> {
    return await db.memories.where('campaignId').equals(campaignId).toArray();
  },

  async save(memory: Memory, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memories.get(memory.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Memory = {
      ...memory,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    await db.memories.put(record);

    VersionControlService.logChange(
      isNew ? 'create' : 'update',
      'memory',
      memory.id,
      memory.title,
      isNew
        ? `Memória "${memory.title}" (${memory.type}) registrada na linha do tempo`
        : `Memória "${memory.title}" atualizada`
    );
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memories.get(id);
    const title = existing?.title || id;
    await db.memories.delete(id);

    VersionControlService.logChange(
      'delete',
      'memory',
      id,
      title,
      `Memória "${title}" removida da campanha`
    );
  }
};

