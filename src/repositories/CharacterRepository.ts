import { db } from '../db';
import type { Character } from '../types';
import { VersionControlService } from '../services/versionControl';

export const CharacterRepository = {
  async get(id: string): Promise<Character | undefined> {
    return await db.characters.get(id);
  },

  async list(campaignId: string): Promise<Character[]> {
    return await db.characters.where('campaignId').equals(campaignId).toArray();
  },

  async save(character: Character, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.characters.get(character.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Character = {
      ...character,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    await db.characters.put(record);

    VersionControlService.logChange(
      isNew ? 'create' : 'update',
      'character',
      character.id,
      character.name,
      isNew
        ? `Personagem "${character.name}" (${character.class || 'Classe'} Nível ${character.level || 1}) criado`
        : `Personagem "${character.name}" atualizado (Nível ${character.level || 1})`
    );
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.characters.get(id);
    const name = existing?.name || id;
    await db.characters.delete(id);

    VersionControlService.logChange(
      'delete',
      'character',
      id,
      name,
      `Personagem "${name}" excluído`
    );
  }
};

