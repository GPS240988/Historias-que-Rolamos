import { db } from '../db';
import type { Media } from '../types';
import { SyncOutboxRepository } from './SyncOutboxRepository';

export const MediaRepository = {
  async get(id: string): Promise<Media | undefined> {
    return await db.media.get(id);
  },

  async list(campaignId: string): Promise<Media[]> {
    return await db.media.where('campaignId').equals(campaignId).toArray();
  },

  async save(media: Media, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.media.get(media.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Media = {
      ...media,
      version: baseVersion,
      createdAt: media.createdAt || new Date().toISOString()
    };

    await db.media.put(record);

    if (isSyncTrigger) {
      // Create metadata-only payload for the D1 change log
      await SyncOutboxRepository.add({
        entityType: 'media',
        entityId: media.id,
        operation: isNew ? 'CREATE' : 'UPDATE',
        baseVersion,
        payload: {
          id: record.id,
          campaignId: record.campaignId,
          filename: record.filename,
          mimeType: record.mimeType,
          size: record.size,
          width: record.width,
          height: record.height,
          title: record.title,
          description: record.description,
          eventDate: record.eventDate,
          relatedCharacterId: record.relatedCharacterId,
          relatedMemoryId: record.relatedMemoryId,
          tags: record.tags,
          isGallery: record.isGallery,
          createdAt: record.createdAt,
          version: record.version
        }
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  },

  async delete(id: string, isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.media.get(id);
    if (!existing) return;

    await db.media.delete(id);

    if (isSyncTrigger) {
      await SyncOutboxRepository.add({
        entityType: 'media',
        entityId: id,
        operation: 'DELETE',
        baseVersion: existing.version || 0,
        payload: null
      });
      import('../services/sync').then(({ SyncEngine }) => SyncEngine.triggerSync());
    }
  }
};
