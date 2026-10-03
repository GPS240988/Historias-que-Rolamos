import { db } from '../db';
import type { Token } from '../types';
import { VersionControlService } from '../services/versionControl';

export const TokenRepository = {
  async get(id: string): Promise<Token | undefined> {
    return await db.tokens.get(id);
  },

  async list(campaignId: string): Promise<Token[]> {
    return await db.tokens.where('campaignId').equals(campaignId).toArray();
  },

  async save(token: Token, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.tokens.get(token.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Token = {
      ...token,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    await db.tokens.put(record);

    VersionControlService.logChange(
      isNew ? 'create' : 'update',
      'token',
      token.id,
      token.name,
      isNew
        ? `Token "${token.name}" (${token.category}) adicionado`
        : `Token "${token.name}" modificado`
    );
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.tokens.get(id);
    const name = existing?.name || id;
    await db.tokens.delete(id);

    VersionControlService.logChange(
      'delete',
      'token',
      id,
      name,
      `Token "${name}" excluído`
    );
  }
};

