import { db } from '../db';
import type { Character } from '../types';

export const CharacterRepository = {
  async get(id: string): Promise<Character | undefined> {
    return await db.characters.get(id);
  },

  async list(campaignId: string): Promise<Character[]> {
    return await db.characters.where('campaignId').equals(campaignId).toArray();
  },

  async save(character: Character, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.characters.get(character.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Character = {
      ...character,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'character',
        character.id,
        isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        record,
        async () => {
          await db.characters.put(record);
        },
        async () => {
          if (existing) {
            await db.characters.put(existing);
          } else {
            await db.characters.delete(character.id);
          }
        }
      );
    } else {
      await db.characters.put(record);
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.characters.get(id);
    if (!existing) return;

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'character',
        id,
        'DELETE',
        existing.version || 0,
        null,
        async () => {
          await db.characters.delete(id);
        },
        async () => {
          await db.characters.put(existing);
        }
      );
    } else {
      await db.characters.delete(id);
    }
  }
};
