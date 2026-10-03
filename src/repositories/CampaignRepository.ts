import { db } from '../db';
import type { Campaign } from '../types';
import { VersionControlService } from '../services/versionControl';

export const CampaignRepository = {
  async get(id: string): Promise<Campaign | undefined> {
    return await db.campaigns.get(id);
  },

  async list(): Promise<Campaign[]> {
    return await db.campaigns.toArray();
  },

  async save(campaign: Campaign, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.campaigns.get(campaign.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Campaign = {
      ...campaign,
      version: baseVersion,
      updatedAt: new Date().toISOString()
    };

    await db.campaigns.put(record);

    VersionControlService.logChange(
      isNew ? 'create' : 'update',
      'campaign',
      campaign.id,
      campaign.name,
      isNew ? `Grimório "${campaign.name}" (${campaign.system}) criado` : `Grimório "${campaign.name}" atualizado`
    );
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.campaigns.get(id);
    const name = existing?.name || id;
    await db.campaigns.delete(id);

    VersionControlService.logChange(
      'delete',
      'campaign',
      id,
      name,
      `Grimório "${name}" excluído permanentemente`
    );
  }
};

