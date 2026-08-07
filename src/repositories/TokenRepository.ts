import { db } from '../db';
import type { Token } from '../types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export const TokenRepository = {
  async get(id: string): Promise<Token | undefined> {
    return await db.tokens.get(id);
  },

  async list(campaignId: string): Promise<Token[]> {
    return await db.tokens.where('campaignId').equals(campaignId).toArray();
  },

  async save(token: Token, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.tokens.get(token.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Token = {
      ...token,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    await db.tokens.put(record);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'token',
        entityId: token.id,
        operation: isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        payload: record
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.tokens.get(id);
    if (!existing) return;

    await db.tokens.delete(id);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'token',
        entityId: id,
        operation: 'DELETE',
        baseVersion: existing.version || 0,
        payload: null
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  }
};
