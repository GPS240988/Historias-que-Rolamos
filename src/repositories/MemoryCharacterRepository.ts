import { db } from '../db';
import type { MemoryCharacter } from '../types';

export const MemoryCharacterRepository = {
  async get(id: string): Promise<MemoryCharacter | undefined> {
    return await db.memoryCharacters.get(id);
  },

  async list(memoryId: string): Promise<MemoryCharacter[]> {
    return await db.memoryCharacters.where('memoryId').equals(memoryId).toArray();
  },

  async save(memoryCharacter: MemoryCharacter, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.memoryCharacters.get(memoryCharacter.id);
    const baseVersion = existing?.version || 0;

    const record: MemoryCharacter = {
      ...memoryCharacter,
      version: baseVersion
    };

    await db.memoryCharacters.put(record);
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    await db.memoryCharacters.delete(id);
  }
};

