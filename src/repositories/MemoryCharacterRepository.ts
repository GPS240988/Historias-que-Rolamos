import { db } from '../db';
import type { MemoryCharacter } from '../types';

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

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'memoryCharacter',
        memoryCharacter.id,
        isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        record,
        async () => {
          await db.memoryCharacters.put(record);
        },
        async () => {
          if (existing) {
            await db.memoryCharacters.put(existing);
          } else {
            await db.memoryCharacters.delete(memoryCharacter.id);
          }
        }
      );
    } else {
      await db.memoryCharacters.put(record);
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memoryCharacters.get(id);
    if (!existing) return;

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'memoryCharacter',
        id,
        'DELETE',
        existing.version || 0,
        null,
        async () => {
          await db.memoryCharacters.delete(id);
        },
        async () => {
          await db.memoryCharacters.put(existing);
        }
      );
    } else {
      await db.memoryCharacters.delete(id);
    }
  }
};
