import { db } from '../db';
import type { MemoryCharacter } from '../types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export const MemoryCharacterRepository = {
  async get(id: string): Promise<MemoryCharacter | undefined> {
    return await db.memoryCharacters.get(id);
  },

  async list(memoryId: string): Promise<MemoryCharacter[]> {
    return await db.memoryCharacters.where('memoryId').equals(memoryId).toArray();
  },

  async save(memoryCharacter: MemoryCharacter, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memoryCharacters.get(memoryCharacter.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: MemoryCharacter = {
      ...memoryCharacter,
      version: baseVersion
    };

    await db.memoryCharacters.put(record);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'memoryCharacter',
        entityId: memoryCharacter.id,
        operation: isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        payload: record
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memoryCharacters.get(id);
    if (!existing) return;

    await db.memoryCharacters.delete(id);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'memoryCharacter',
        entityId: id,
        operation: 'DELETE',
        baseVersion: existing.version || 0,
        payload: null
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  }
};
