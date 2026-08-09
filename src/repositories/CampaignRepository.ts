import { db } from '../db';
import type { Campaign } from '../types';

export const CampaignRepository = {
  async get(id: string): Promise<Campaign | undefined> {
    return await db.campaigns.get(id);
  },

  async list(): Promise<Campaign[]> {
    return await db.campaigns.toArray();
  },

  async save(campaign: Campaign, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.campaigns.get(campaign.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Campaign = {
      ...campaign,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'campaign',
        campaign.id,
        isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        record,
        async () => {
          await db.campaigns.put(record);
        },
        async () => {
          if (existing) {
            await db.campaigns.put(existing);
          } else {
            await db.campaigns.delete(campaign.id);
          }
        }
      );
    } else {
      await db.campaigns.put(record);
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.campaigns.get(id);
    if (!existing) return;

    if (isSyncTrigger && localStorage.getItem('cloud_token')) {
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.performOnlineWrite(
        'campaign',
        id,
        'DELETE',
        existing.version || 0,
        null,
        async () => {
          await db.campaigns.delete(id);
        },
        async () => {
          await db.campaigns.put(existing);
        }
      );
    } else {
      await db.campaigns.delete(id);
    }
  }
};
