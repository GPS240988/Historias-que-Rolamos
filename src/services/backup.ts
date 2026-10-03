import { db } from '../db';
import { generateThumbnail } from './media';
import type { SystemBackup, Media, Campaign } from '../types';
import JSZip from 'jszip';

const STORAGE_KEY_SEQUENCE = 'export_sequence_version';
const STORAGE_KEY_LAST_IMPORT = 'last_import_info';

export interface LastImportInfo {
  sequence: number;
  filename: string;
  importedAt: string;
  campaignsCount: number;
  charactersCount: number;
  memoriesCount: number;
  tokensCount: number;
  mediaCount: number;
}

/**
 * Service to handle local JSON data backups and Full binary ZIP memory archives
 * 100% offline-first, with zero cloud dependency.
 */
export const BackupService = {
  /**
   * Retrieves the current export sequence counter from storage (or defaults to 0).
   */
  getCurrentExportSequence(): number {
    const raw = localStorage.getItem(STORAGE_KEY_SEQUENCE);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  },

  /**
   * Increments and returns the next export sequence version number.
   * e.g. 1, 2, 3...
   */
  getNextExportSequence(): number {
    const current = this.getCurrentExportSequence();
    const next = current + 1;
    localStorage.setItem(STORAGE_KEY_SEQUENCE, next.toString());
    return next;
  },

  /**
   * Updates the sequence counter when a backup is imported,
   * ensuring future exports will always have a higher version number.
   */
  syncExportSequence(importedSequence: number, filename?: string, details?: Partial<LastImportInfo>): void {
    const current = this.getCurrentExportSequence();
    if (importedSequence > current) {
      localStorage.setItem(STORAGE_KEY_SEQUENCE, importedSequence.toString());
    }

    if (filename) {
      const info: LastImportInfo = {
        sequence: importedSequence,
        filename,
        importedAt: new Date().toISOString(),
        campaignsCount: details?.campaignsCount ?? 0,
        charactersCount: details?.charactersCount ?? 0,
        memoriesCount: details?.memoriesCount ?? 0,
        tokensCount: details?.tokensCount ?? 0,
        mediaCount: details?.mediaCount ?? 0,
      };
      localStorage.setItem(STORAGE_KEY_LAST_IMPORT, JSON.stringify(info));
    }
  },

  /**
   * Reads information about the last imported backup, if available.
   */
  getLastImportInfo(): LastImportInfo | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LAST_IMPORT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Attempts to extract a version sequence number from a backup filename.
   * Recognizes patterns like `..._v3_...`, `...-v04-...`, `..._v12.json`, etc.
   */
  parseSequenceFromFilename(filename: string): number | null {
    const match = filename.match(/[_-]v(\d+)[._-]/i) || filename.match(/[_-]v(\d+)$/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      return isNaN(num) ? null : num;
    }
    return null;
  },

  /**
   * Generates a timestamp string formatted as YYYY-MM-DD_HHmmss.
   */
  getFormattedTimestamp(): { dateStr: string; timeStr: string } {
    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10); // YYYY-MM-DD
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}${minutes}${seconds}`;
    return { dateStr, timeStr };
  },

  /**
   * Sweeps the entire local system database and compiles all tables into a unified JSON structure.
   * Leaves NO record, photo reference, character evolution, or relation behind.
   */
  async compileFullSystemJSON(options?: { exportSequence?: number }): Promise<SystemBackup> {
    const campaigns = await db.campaigns.toArray();
    const characters = await db.characters.toArray();
    const memories = await db.memories.toArray();
    const tokens = await db.tokens.toArray();
    const memoryCharacters = await db.memoryCharacters.toArray();
    const allMedia = await db.media.toArray();

    // Strip raw binary Blobs from metadata to make it clean serializable JSON
    const mediaMetadata = allMedia.map(m => ({
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
      createdAt: m.createdAt,
      version: m.version
    }));

    const exportSequence = options?.exportSequence ?? this.getNextExportSequence();

    return {
      format: 'historias-que-rolamos-backup',
      version: '2.0.0',
      exportSequence,
      exportedAt: new Date().toISOString(),
      appName: 'Histórias que Rolamos',
      summary: {
        campaignsCount: campaigns.length,
        charactersCount: characters.length,
        memoriesCount: memories.length,
        tokensCount: tokens.length,
        memoryCharactersCount: memoryCharacters.length,
        mediaCount: mediaMetadata.length
      },
      campaigns,
      characters,
      memories,
      memoryCharacters,
      tokens,
      mediaMetadata
    };
  },

  /**
   * Compiles data for a single campaign (maintained for backward compatibility).
   */
  async compileJSONData(campaignId: string): Promise<SystemBackup> {
    const campaigns = await db.campaigns.where('id').equals(campaignId).toArray();
    const characters = await db.characters.where('campaignId').equals(campaignId).toArray();
    const memories = await db.memories.where('campaignId').equals(campaignId).toArray();
    const tokens = await db.tokens.where('campaignId').equals(campaignId).toArray();

    const memoryIds = memories.map(m => m.id);
    const memoryCharacters = memoryIds.length > 0
      ? await db.memoryCharacters.where('memoryId').anyOf(memoryIds).toArray()
      : [];

    const mediaList = await db.media.where('campaignId').equals(campaignId).toArray();
    const mediaMetadata = mediaList.map(m => ({
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
      createdAt: m.createdAt,
      version: m.version
    }));

    const exportSequence = this.getNextExportSequence();

    return {
      format: 'historias-que-rolamos-backup',
      version: '2.0.0',
      exportSequence,
      exportedAt: new Date().toISOString(),
      appName: 'Histórias que Rolamos',
      summary: {
        campaignsCount: campaigns.length,
        charactersCount: characters.length,
        memoriesCount: memories.length,
        tokensCount: tokens.length,
        memoryCharactersCount: memoryCharacters.length,
        mediaCount: mediaMetadata.length
      },
      campaigns,
      characters,
      memories,
      memoryCharacters,
      tokens,
      mediaMetadata
    };
  },

  /**
   * Exports the entire database as a structured JSON file with explicit versioning in the filename.
   * Format: `historias_que_rolamos_v{seq}_{YYYY-MM-DD}_{HHMMSS}.json`
   */
  async exportFullSystemJSON(): Promise<{ filename: string; sequence: number }> {
    const data = await this.compileFullSystemJSON();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const { dateStr, timeStr } = this.getFormattedTimestamp();
    const filename = `historias_que_rolamos_v${data.exportSequence}_${dateStr}_${timeStr}.json`;

    this.triggerDownload(blob, filename);
    return { filename, sequence: data.exportSequence };
  },

  /**
   * Triggers a browser download of a JSON backup file for a specific campaign or full system.
   */
  async exportJSONBackup(campaignId?: string): Promise<{ filename: string; sequence: number }> {
    if (!campaignId) {
      return await this.exportFullSystemJSON();
    }

    const data = await this.compileJSONData(campaignId);
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const campaignName = data.campaigns[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'campanha';
    const { dateStr, timeStr } = this.getFormattedTimestamp();
    const filename = `memoria_${campaignName}_v${data.exportSequence}_${dateStr}_${timeStr}.json`;

    this.triggerDownload(blob, filename);
    return { filename, sequence: data.exportSequence };
  },

  /**
   * Exports the complete system: structured JSON + ALL binary media files (images, PDFs, attachments, tokens).
   * Leaves NOTHING out. Places each file in `media/` directory inside the archive.
   * Filename: `historias_que_rolamos_completo_v{seq}_{YYYY-MM-DD}_{HHMMSS}.zip`
   */
  async exportFullSystemZipBackup(onProgress?: (progress: number) => void): Promise<{ filename: string; sequence: number }> {
    const zip = new JSZip();

    // 1. Compile full system JSON (with new sequence number)
    const exportSequence = this.getNextExportSequence();
    const data = await this.compileFullSystemJSON({ exportSequence });

    // Store db.json inside root of ZIP
    zip.file('db.json', JSON.stringify(data, null, 2));

    // 2. Fetch ALL media binary records from IndexedDB
    const allMedia = await db.media.toArray();
    const totalMedia = allMedia.length;

    const mediaFolder = zip.folder('media');
    if (mediaFolder && totalMedia > 0) {
      for (let i = 0; i < totalMedia; i++) {
        const item = allMedia[i];
        const fileExt = item.filename.split('.').pop() || 'bin';
        const zipPath = `${item.id}.${fileExt}`;
        
        if (item.blob) {
          mediaFolder.file(zipPath, item.blob);
        }

        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalMedia) * 85)); // 0-85% for media bundling
        }
      }
    } else if (onProgress) {
      onProgress(85);
    }

    // 3. Manifest metadata file for inspection without opening db.json
    const manifest = {
      appName: 'Histórias que Rolamos',
      backupFormat: 'full-system-archive',
      version: '2.0.0',
      exportSequence,
      exportedAt: data.exportedAt,
      summary: data.summary,
      filesArchived: totalMedia
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 4. Human-readable readme
    const readme = `=====================================================
HISTÓRIAS QUE ROLAMOS - BACKUP COMPLETO DO SISTEMA
=====================================================
Versão da Exportação : v${exportSequence}
Data de Geração      : ${new Date(data.exportedAt).toLocaleString('pt-BR')}
Formato do Arquivo   : ZIP (db.json + /media)

CONTEÚDO ARQUIVADO:
- Campanhas: ${data.summary.campaignsCount}
- Heróis e Aliados: ${data.summary.charactersCount}
- Memórias da Jornada: ${data.summary.memoriesCount}
- Tokens e Brasões: ${data.summary.tokensCount}
- Mídias / Imagens: ${data.summary.mediaCount}

COMO RESTAURAR:
Para restaurar suas crônicas em qualquer dispositivo ou navegador,
abra "Histórias que Rolamos", vá em Configurações > Restauração de Dados,
e selecione este arquivo .zip. Toda a sua história e imagens serão recuperadas.
=====================================================`;
    zip.file('README.txt', readme);

    // 5. Generate ZIP Blob
    if (onProgress) onProgress(88);
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (metadata) => {
      if (onProgress) {
        onProgress(88 + Math.round(metadata.percent * 0.12));
      }
    });

    // 6. Download ZIP
    const { dateStr, timeStr } = this.getFormattedTimestamp();
    const filename = `historias_que_rolamos_completo_v${exportSequence}_${dateStr}_${timeStr}.zip`;

    this.triggerDownload(zipBlob, filename);
    return { filename, sequence: exportSequence };
  },

  /**
   * Backwards-compatible wrapper for single campaign ZIP export or full system ZIP.
   */
  async exportFullZipBackup(campaignId?: string, onProgress?: (progress: number) => void): Promise<void> {
    if (!campaignId) {
      await this.exportFullSystemZipBackup(onProgress);
      return;
    }

    // If campaignId is specified, check if user has only 1 campaign anyway
    const allCampaigns = await db.campaigns.toArray();
    if (allCampaigns.length <= 1) {
      await this.exportFullSystemZipBackup(onProgress);
      return;
    }

    // Export specific campaign with all its media
    const zip = new JSZip();
    const exportSequence = this.getNextExportSequence();
    const data = await this.compileJSONData(campaignId);
    data.exportSequence = exportSequence;

    zip.file('db.json', JSON.stringify(data, null, 2));

    const mediaList = await db.media.where('campaignId').equals(campaignId).toArray();
    const totalMedia = mediaList.length;
    const mediaFolder = zip.folder('media');

    if (mediaFolder && totalMedia > 0) {
      for (let i = 0; i < totalMedia; i++) {
        const item = mediaList[i];
        const fileExt = item.filename.split('.').pop() || 'bin';
        const zipPath = `${item.id}.${fileExt}`;
        if (item.blob) {
          mediaFolder.file(zipPath, item.blob);
        }
        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalMedia) * 85));
        }
      }
    } else if (onProgress) {
      onProgress(85);
    }

    if (onProgress) onProgress(88);
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (metadata) => {
      if (onProgress) {
        onProgress(88 + Math.round(metadata.percent * 0.12));
      }
    });

    const campaignName = data.campaigns[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'campanha';
    const { dateStr, timeStr } = this.getFormattedTimestamp();
    const filename = `memoria_completa_${campaignName}_v${exportSequence}_${dateStr}_${timeStr}.zip`;

    this.triggerDownload(zipBlob, filename);
  },

  /**
   * Helper to trigger native browser file download.
   */
  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  /**
   * Imports structured JSON backup.
   * IMPORTANT REQUIREMENT: Overwrites ALL previously registered data in IndexedDB completely.
   */
  async importJSONData(backup: any, filename?: string): Promise<{ campaignIds: string[]; sequence: number }> {
    if (!backup || typeof backup !== 'object') {
      throw new Error('Formato de backup inválido. Conteúdo corrompido ou ilegível.');
    }

    if (!Array.isArray(backup.campaigns) || backup.campaigns.length === 0) {
      throw new Error('Formato de backup inválido. Nenhuma campanha encontrada no arquivo.');
    }

    const campaigns: Campaign[] = backup.campaigns;
    const characters = Array.isArray(backup.characters) ? backup.characters : [];
    const memories = Array.isArray(backup.memories) ? backup.memories : [];
    const tokens = Array.isArray(backup.tokens) ? backup.tokens : [];
    const memoryCharacters = Array.isArray(backup.memoryCharacters) ? backup.memoryCharacters : [];
    const mediaMetadata = Array.isArray(backup.mediaMetadata) ? backup.mediaMetadata : [];

    // Extract sequence version from metadata or filename
    let sequence = typeof backup.exportSequence === 'number' ? backup.exportSequence : 0;
    if (sequence === 0 && filename) {
      const parsed = this.parseSequenceFromFilename(filename);
      if (parsed) sequence = parsed;
    }

    // Set backup version source on campaigns for traceability
    for (const camp of campaigns) {
      if (filename) {
        camp.lastImportedFrom = filename;
      }
      if (sequence > 0) {
        camp.version = sequence;
      }
    }

    const campaignIds = campaigns.map(c => c.id);

    // OVERWRITE ALL: Wipe existing IndexedDB state completely before restoring!
    await db.clearAll();

    // Insert all collections cleanly into Dexie
    await db.transaction('rw', [db.campaigns, db.characters, db.memories, db.tokens, db.memoryCharacters, db.media], async () => {
      if (campaigns.length > 0) await db.campaigns.bulkPut(campaigns);
      if (characters.length > 0) await db.characters.bulkPut(characters);
      if (memories.length > 0) await db.memories.bulkPut(memories);
      if (tokens.length > 0) await db.tokens.bulkPut(tokens);
      if (memoryCharacters.length > 0) await db.memoryCharacters.bulkPut(memoryCharacters);

      if (mediaMetadata.length > 0) {
        for (const meta of mediaMetadata) {
          const fallbackMedia: Media = {
            ...meta,
            blob: new Blob([], { type: meta.mimeType || 'application/octet-stream' }),
            thumbnail: new Blob([], { type: meta.mimeType || 'application/octet-stream' })
          };
          await db.media.put(fallbackMedia);
        }
      }
    });

    // Update the system export sequence counter so subsequent exports are strictly higher
    this.syncExportSequence(sequence, filename, {
      campaignsCount: campaigns.length,
      charactersCount: characters.length,
      memoriesCount: memories.length,
      tokensCount: tokens.length,
      mediaCount: mediaMetadata.length
    });

    return { campaignIds, sequence };
  },

  /**
   * Extracts and restores a full campaign/system archive from a ZIP file.
   * Reads db.json, fetches media files, regenerates canvas thumbnails, and commits to IndexedDB.
   * IMPORTANT REQUIREMENT: Overwrites ALL previously registered data in IndexedDB completely.
   */
  async importFullZipData(file: File, onProgress?: (progress: number) => void): Promise<{ campaignIds: string[]; sequence: number }> {
    const zip = await JSZip.loadAsync(file);

    // 1. Read db.json
    const dbFile = zip.file('db.json');
    if (!dbFile) {
      throw new Error('Backup inválido. O arquivo db.json não foi encontrado dentro do pacote ZIP.');
    }

    const dbContent = await dbFile.async('text');
    let backupData: any;
    try {
      backupData = JSON.parse(dbContent);
    } catch {
      throw new Error('Arquivo db.json dentro do ZIP está corrompido.');
    }

    // 2. Validate campaigns
    if (!backupData || !Array.isArray(backupData.campaigns) || backupData.campaigns.length === 0) {
      throw new Error('Backup inválido. Nenhum registro de campanha encontrado no arquivo.');
    }

    const campaigns: Campaign[] = backupData.campaigns;
    const characters = Array.isArray(backupData.characters) ? backupData.characters : [];
    const memories = Array.isArray(backupData.memories) ? backupData.memories : [];
    const tokens = Array.isArray(backupData.tokens) ? backupData.tokens : [];
    const memoryCharacters = Array.isArray(backupData.memoryCharacters) ? backupData.memoryCharacters : [];
    const metadataList: any[] = Array.isArray(backupData.mediaMetadata) ? backupData.mediaMetadata : [];

    // Extract sequence version
    let sequence = typeof backupData.exportSequence === 'number' ? backupData.exportSequence : 0;
    if (sequence === 0) {
      const parsed = this.parseSequenceFromFilename(file.name);
      if (parsed) sequence = parsed;
    }

    for (const camp of campaigns) {
      camp.lastImportedFrom = file.name;
      if (sequence > 0) {
        camp.version = sequence;
      }
    }

    const campaignIds = campaigns.map(c => c.id);

    // 3. Pre-process media files and rebuild thumbnails OUTSIDE the database transaction
    const totalMedia = metadataList.length;
    const preparedMediaRecords: Media[] = [];

    for (let i = 0; i < totalMedia; i++) {
      const meta = metadataList[i];
      const fileExt = meta.filename.split('.').pop() || 'bin';
      
      // Look for media in zip: media/${id}.${ext} or fallback to media/${id}
      let zipFile = zip.file(`media/${meta.id}.${fileExt}`);
      if (!zipFile) {
        zipFile = zip.file(`media/${meta.id}`);
      }

      let blob = new Blob([], { type: meta.mimeType || 'application/octet-stream' });
      let thumbnailBlob = blob;

      if (zipFile) {
        blob = await zipFile.async('blob');

        // Re-generate thumbnail if it's an image
        if (meta.mimeType?.startsWith('image/') && meta.mimeType !== 'image/svg+xml' && blob.size > 0) {
          try {
            const imgFile = new File([blob], meta.filename, { type: meta.mimeType });
            thumbnailBlob = await generateThumbnail(imgFile);
          } catch {
            thumbnailBlob = blob;
          }
        } else {
          thumbnailBlob = blob;
        }
      }

      preparedMediaRecords.push({
        ...meta,
        blob,
        thumbnail: thumbnailBlob
      });

      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalMedia) * 80));
      }
    }

    if (onProgress && totalMedia === 0) {
      onProgress(80);
    }

    // 4. OVERWRITE ALL: Wipe existing database state completely before inserting new data!
    if (onProgress) onProgress(85);
    await db.clearAll();

    // 5. Commit all new collections cleanly
    if (onProgress) onProgress(90);
    await db.transaction('rw', [db.campaigns, db.characters, db.memories, db.tokens, db.memoryCharacters, db.media], async () => {
      if (campaigns.length > 0) await db.campaigns.bulkPut(campaigns);
      if (characters.length > 0) await db.characters.bulkPut(characters);
      if (memories.length > 0) await db.memories.bulkPut(memories);
      if (tokens.length > 0) await db.tokens.bulkPut(tokens);
      if (memoryCharacters.length > 0) await db.memoryCharacters.bulkPut(memoryCharacters);

      for (const mediaRecord of preparedMediaRecords) {
        await db.media.put(mediaRecord);
      }
    });

    if (onProgress) onProgress(100);

    // Sync sequence counter
    this.syncExportSequence(sequence, file.name, {
      campaignsCount: campaigns.length,
      charactersCount: characters.length,
      memoriesCount: memories.length,
      tokensCount: tokens.length,
      mediaCount: preparedMediaRecords.length
    });

    return { campaignIds, sequence };
  }
};
