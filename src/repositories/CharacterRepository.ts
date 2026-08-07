import { db } from '../db';
import type { Character } from '../types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

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

    await db.characters.put(record);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'character',
        entityId: character.id,
        operation: isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        payload: record
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.characters.get(id);
    if (!existing) return;

    await db.characters.delete(id);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'character',
        entityId: id,
        operation: 'DELETE',
        baseVersion: existing.version || 0,
        payload: null
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  }
};
