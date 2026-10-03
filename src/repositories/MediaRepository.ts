import { db } from '../db';
import type { Media } from '../types';

export const MediaRepository = {
  async get(id: string): Promise<Media | undefined> {
    return await db.media.get(id);
  },

  async list(campaignId: string): Promise<Media[]> {
    return await db.media.where('campaignId').equals(campaignId).toArray();
  },

  async save(media: Media, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.media.get(media.id);
    const baseVersion = existing?.version || 0;

    const record: Media = {
      ...media,
      version: baseVersion,
      createdAt: media.createdAt || new Date().toISOString()
    };

    await db.media.put(record);
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    await db.media.delete(id);
  }
};

