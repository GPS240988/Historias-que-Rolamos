import { db } from '../db';
import type { Campaign } from '../types';

export const CampaignRepository = {
  async get(id: string): Promise<Campaign | undefined> {
    return await db.campaigns.get(id);
  },

  async list(): Promise<Campaign[]> {
    return await db.campaigns.toArray();
  },

  async save(campaign: Campaign, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.campaigns.get(campaign.id);
    const baseVersion = existing?.version || 0;

    const record: Campaign = {
      ...campaign,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    await db.campaigns.put(record);
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    await db.campaigns.delete(id);
  }
};

