import { db } from '../db';
import type { Character } from '../types';

export const CharacterRepository = {
  async get(id: string): Promise<Character | undefined> {
    return await db.characters.get(id);
  },

  async list(campaignId: string): Promise<Character[]> {
    return await db.characters.where('campaignId').equals(campaignId).toArray();
  },

  async save(character: Character, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.characters.get(character.id);
    const baseVersion = existing?.version || 0;

    const record: Character = {
      ...character,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    await db.characters.put(record);
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    await db.characters.delete(id);
  }
};

