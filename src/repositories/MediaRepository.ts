import { db } from '../db';
import type { Media } from '../types';
import { VersionControlService } from '../services/versionControl';

export const MediaRepository = {
  async get(id: string): Promise<Media | undefined> {
    return await db.media.get(id);
  },

  async list(campaignId: string): Promise<Media[]> {
    return await db.media.where('campaignId').equals(campaignId).toArray();
  },

  async save(media: Media, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.media.get(media.id);
    const isNew = !existing;
    const baseVersion = existing?.version || 0;

    const record: Media = {
      ...media,
      version: baseVersion,
      createdAt: media.createdAt || new Date().toISOString()
    };

    await db.media.put(record);

    VersionControlService.logChange(
      isNew ? 'create' : 'update',
      'media',
      media.id,
      media.filename || 'Imagem',
      isNew
        ? `Arquivo/Imagem "${media.filename || 'Mídia'}" (${media.mimeType || 'imagem'}) adicionado`
        : `Mídia "${media.filename || 'Mídia'}" atualizada`
    );
  },

  async delete(id: string, _isSyncTrigger: boolean = true): Promise<void> {
    const existing = await db.media.get(id);
    const name = existing?.filename || id;
    await db.media.delete(id);

    VersionControlService.logChange(
      'delete',
      'media',
      id,
      name,
      `Arquivo/Imagem "${name}" excluído`
    );
  }
};

