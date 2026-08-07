import { db } from '../db';
import type { Campaign } from '../types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

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

    await db.campaigns.put(record);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'campaign',
        entityId: campaign.id,
        operation: isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        payload: record
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.campaigns.get(id);
    if (!existing) return;

    await db.campaigns.delete(id);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'campaign',
        entityId: id,
        operation: 'DELETE',
        baseVersion: existing.version || 0,
        payload: null
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  }
};
