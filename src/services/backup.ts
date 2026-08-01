import { db } from '../db';
import { generateThumbnail } from './media';
import type { CampaignBackup, Media } from '../types';
import JSZip from 'jszip';

/**
   * Service to handle JSON data backups and Full binary ZIP memory archives
 */
export const BackupService = {
  /**
   * Compiles the campaign structured data tables into a single JSON object.
   * Excludes raw binary blobs.
   */
  async compileJSONData(campaignId: string): Promise<CampaignBackup> {
    const campaigns = await db.campaigns.where('id').equals(campaignId).toArray();
    const characters = await db.characters.where('campaignId').equals(campaignId).toArray();
    const memories = await db.memories.where('campaignId').equals(campaignId).toArray();
    const tokens = await db.tokens.where('campaignId').equals(campaignId).toArray();
    
    const memoryIds = memories.map(m => m.id);
    const memoryCharacters = memoryIds.length > 0
      ? await db.memoryCharacters.where('memoryId').anyOf(memoryIds).toArray()
      : [];

    // Strip binary data for metadata JSON representation
    const mediaMetadata = (await db.media.where('campaignId').equals(campaignId).toArray()).map(m => ({
      id: m.id,
      campaignId: m.campaignId,
      filename: m.filename,
      mimeType: m.mimeType,
      size: m.size,
      width: m.width,
      height: m.height,
      title: m.title,
      description: m.description,
      eventDate: m.eventDate,
      relatedCharacterId: m.relatedCharacterId,
      relatedMemoryId: m.relatedMemoryId,
      tags: m.tags,
      isGallery: m.isGallery,
      createdAt: m.createdAt
    }));

    return {
      version: '1.0.0',
      campaigns,
      characters,
      memories,
      memoryCharacters,
      tokens,
      mediaMetadata
    };
  },

  /**
   * Triggers a browser download of the Campaign data JSON file.
   */
  async exportJSONBackup(campaignId: string): Promise<void> {
    const data = await this.compileJSONData(campaignId);
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const campaignName = data.campaigns[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'campanha';
    const dateStr = new Date().toISOString().substring(0, 10);

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `memoria_${campaignName}_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  /**
   * Packs structured data and original binary media files into a compressed .zip file,
   * then downloads it. Shows progress updates if needed.
   */
  async exportFullZipBackup(campaignId: string, onProgress?: (progress: number) => void): Promise<void> {
    const zip = new JSZip();

    // 1. Add structured JSON
    const data = await this.compileJSONData(campaignId);
    zip.file('db.json', JSON.stringify(data, null, 2));

    // 2. Fetch all media binaries for this campaign
    const mediaList = await db.media.where('campaignId').equals(campaignId).toArray();
    const totalMedia = mediaList.length;

    // Create a subfolder inside the ZIP
    const mediaFolder = zip.folder('media');

    if (mediaFolder && totalMedia > 0) {
      for (let i = 0; i < totalMedia; i++) {
        const item = mediaList[i];

        // Save the original binary blob in the ZIP
        const fileExt = item.filename.split('.').pop() || 'bin';
        const zipPath = `${item.id}.${fileExt}`;
        mediaFolder.file(zipPath, item.blob);

        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalMedia) * 90)); // Save last 10% for zip generation
        }
      }
    } else if (onProgress) {
      onProgress(90);
    }

    // 3. Generate ZIP blob
    if (onProgress) onProgress(92);
    const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      if (onProgress) {
        onProgress(92 + Math.round(metadata.percent * 0.08));
      }
    });

    // 4. Download file
    const campaignName = data.campaigns[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'campanha';
    const dateStr = new Date().toISOString().substring(0, 10);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = `backup_completo_${campaignName}_${dateStr}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  /**
   * Parses and imports campaign structured JSON data into IndexedDB.
   * Wipes existing data for the imported campaigns before overwriting.
   */
  async importJSONData(backup: CampaignBackup): Promise<void> {
    if (!backup.campaigns || backup.campaigns.length === 0) {
      throw new Error('Formato de backup inválido. Campanha não encontrada.');
    }

    await db.transaction('rw', [db.campaigns, db.characters, db.memories, db.tokens, db.memoryCharacters, db.media], async () => {
      // Scoped delete for campaigns present in backup
      for (const camp of backup.campaigns) {
        await db.campaigns.delete(camp.id);
        await db.characters.where('campaignId').equals(camp.id).delete();
        const existingMemories = await db.memories.where('campaignId').equals(camp.id).toArray();
        const memoryIds = existingMemories.map(m => m.id);
        if (memoryIds.length > 0) {
          await db.memoryCharacters.where('memoryId').anyOf(memoryIds).delete();
        }
        await db.memories.where('campaignId').equals(camp.id).delete();
        await db.tokens.where('campaignId').equals(camp.id).delete();
        await db.media.where('campaignId').equals(camp.id).delete();
      }

      // Put collections
      for (const camp of backup.campaigns) await db.campaigns.put(camp);
      for (const char of backup.characters) await db.characters.put(char);
      for (const mem of backup.memories) await db.memories.put(mem);
      for (const tok of backup.tokens) await db.tokens.put(tok);
      for (const mchar of backup.memoryCharacters) await db.memoryCharacters.put(mchar);

      // Save media metadata rows
      if (backup.mediaMetadata) {
        for (const meta of backup.mediaMetadata) {
          const fallbackMedia: Media = {
            ...meta,
            blob: new Blob([], { type: meta.mimeType }), // Empty fallback blob
            thumbnailBlob: new Blob([], { type: meta.mimeType })
          };
          await db.media.put(fallbackMedia);
        }
      }
    });
  },

  /**
   * Extracts and restores a full campaign from a ZIP file.
   * Parses db.json, fetches media files, rebuilds canvas thumbnails, and commits to IndexedDB.
   */
  async importFullZipData(file: File, onProgress?: (progress: number) => void): Promise<void> {
    const zip = await JSZip.loadAsync(file);

    // 1. Read db.json
    const dbFile = zip.file('db.json');
    if (!dbFile) {
      throw new Error('Backup inválido. db.json não encontrado dentro do ZIP.');
    }

    const dbContent = await dbFile.async('text');
    const backupData: CampaignBackup = JSON.parse(dbContent);

    // 2. Validate Campaign
    if (!backupData.campaigns || backupData.campaigns.length === 0) {
      throw new Error('Backup inválido. Nenhum registro de campanha encontrado.');
    }

    // 3. Scoped clear and insert structured tables
    await db.transaction('rw', [db.campaigns, db.characters, db.memories, db.tokens, db.memoryCharacters, db.media], async () => {
      for (const camp of backupData.campaigns) {
        await db.campaigns.delete(camp.id);
        await db.characters.where('campaignId').equals(camp.id).delete();
        const existingMemories = await db.memories.where('campaignId').equals(camp.id).toArray();
        const memoryIds = existingMemories.map(m => m.id);
        if (memoryIds.length > 0) {
          await db.memoryCharacters.where('memoryId').anyOf(memoryIds).delete();
        }
        await db.memories.where('campaignId').equals(camp.id).delete();
        await db.tokens.where('campaignId').equals(camp.id).delete();
        await db.media.where('campaignId').equals(camp.id).delete();
      }

      for (const camp of backupData.campaigns) await db.campaigns.put(camp);
      for (const char of backupData.characters) await db.characters.put(char);
      for (const mem of backupData.memories) await db.memories.put(mem);
      for (const tok of backupData.tokens) await db.tokens.put(tok);
      for (const mchar of backupData.memoryCharacters) await db.memoryCharacters.put(mchar);

      // 4. Restore media files and generate thumbnails
      const metadataList = backupData.mediaMetadata || [];
      const totalMedia = metadataList.length;

      if (totalMedia === 0 && onProgress) {
        onProgress(100);
        return;
      }

      for (let i = 0; i < totalMedia; i++) {
        const meta = metadataList[i];

        // Find matching binary inside ZIP folder /media
        const fileExt = meta.filename.split('.').pop() || 'bin';
        const zipPath = `media/${meta.id}.${fileExt}`;
        const zipFile = zip.file(zipPath);

        let blob = new Blob([], { type: meta.mimeType });
        let thumbnailBlob = blob;

        if (zipFile) {
          blob = await zipFile.async('blob');

          // Re-generate optimized thumbnail and preview dimensions
          if (meta.mimeType !== 'image/svg+xml' && blob.size > 0) {
            try {
              // Convert blob to File wrapper for canvas utility
              const imgFile = new File([blob], meta.filename, { type: meta.mimeType });
              thumbnailBlob = await generateThumbnail(imgFile);
            } catch (err) {
              console.warn('Could not recreate thumbnail for media:', meta.id, err);
              thumbnailBlob = blob;
            }
          } else {
            thumbnailBlob = blob;
          }
        }

        const mediaRecord: Media = {
          ...meta,
          blob,
          thumbnailBlob
        };

        await db.media.put(mediaRecord);

        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalMedia) * 100));
        }
      }
    });
  }
};
