import { db } from '../db';
import type { Token } from '../types';

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

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'token',
        token.id,
        isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        record,
        async () => {
          await db.tokens.put(record);
        },
        async () => {
          if (existing) {
            await db.tokens.put(existing);
          } else {
            await db.tokens.delete(token.id);
          }
        }
      );
    } else {
      await db.tokens.put(record);
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.tokens.get(id);
    if (!existing) return;

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'token',
        id,
        'DELETE',
        existing.version || 0,
        null,
        async () => {
          await db.tokens.delete(id);
        },
        async () => {
          await db.tokens.put(existing);
        }
      );
    } else {
      await db.tokens.delete(id);
    }
  }
};
