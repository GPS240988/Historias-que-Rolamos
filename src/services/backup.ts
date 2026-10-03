import { db } from '../db';
import { generateThumbnail } from './media';
import { VersionControlService } from './versionControl';
import type { SystemBackup, Media, Campaign } from '../types';
import JSZip from 'jszip';

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

export interface ExportResult {
  filename: string;
  sequence: number;
  isNewVersion: boolean;
}

/**
 * Service to handle local JSON data backups and Full binary ZIP memory archives
 * 100% offline-first, with zero cloud dependency.
 */
export const BackupService = {
  /**
   * Retrieves the current export sequence / version number.
   */
  getCurrentExportSequence(): number {
    return VersionControlService.getCurrentVersion();
  },

  /**
   * Previews the next export sequence / version number and whether it will create a new version.
   */
  peekNextExportSequence(): { version: number; isNewVersion: boolean } {
    return VersionControlService.peekNextExportVersion();
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

    const exportSequence = options?.exportSequence ?? VersionControlService.peekNextExportVersion().version;
    const versionHistory = VersionControlService.getVersionHistory();

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
      versionHistory,
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

    const exportSequence = VersionControlService.peekNextExportVersion().version;
    const versionHistory = VersionControlService.getVersionHistory();

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
      versionHistory,
      campaigns,
      characters,
      memories,
      memoryCharacters,
      tokens,
      mediaMetadata
    };
  },

  /**
   * Exports the entire database as a structured JSON file.
   * If there are pending changes: increments version and logs history.
   * If there are NO pending changes: exports at current version without incrementing.
   * Filename: `historias_que_rolamos_v{seq}_{YYYY-MM-DD}_{HHMMSS}.json`
   */
  async exportFullSystemJSON(): Promise<ExportResult> {
    const { version, isNewVersion } = VersionControlService.peekNextExportVersion();
    const data = await this.compileFullSystemJSON({ exportSequence: version });

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const { dateStr, timeStr } = this.getFormattedTimestamp();
    const filename = `historias_que_rolamos_v${version}_${dateStr}_${timeStr}.json`;

    // Commit change log / version state
    VersionControlService.commitExport(data.summary);

    this.triggerDownload(blob, filename);
    return { filename, sequence: version, isNewVersion };
  },

  /**
   * Triggers a browser download of a JSON backup file for a specific campaign or full system.
   */
  async exportJSONBackup(campaignId?: string): Promise<ExportResult> {
    if (!campaignId) {
      return await this.exportFullSystemJSON();
    }

    const { version, isNewVersion } = VersionControlService.peekNextExportVersion();
    const data = await this.compileJSONData(campaignId);
    data.exportSequence = version;

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const campaignName = data.campaigns[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'campanha';
    const { dateStr, timeStr } = this.getFormattedTimestamp();
    const filename = `memoria_${campaignName}_v${version}_${dateStr}_${timeStr}.json`;

    VersionControlService.commitExport(data.summary);

    this.triggerDownload(blob, filename);
    return { filename, sequence: version, isNewVersion };
  },

  /**
   * Exports the complete system: structured JSON + ALL binary media files (images, PDFs, attachments, tokens).
   * Leaves NOTHING out. Places each file in `media/` directory inside the archive.
   * If there are pending changes: increments version and commits history.
   * If there are NO pending changes: exports at current version without incrementing.
   * Filename: `historias_que_rolamos_completo_v{seq}_{YYYY-MM-DD}_{HHMMSS}.zip`
   */
  async exportFullSystemZipBackup(onProgress?: (progress: number) => void): Promise<ExportResult> {
    const zip = new JSZip();

    // 1. Determine version according to pending changes
    const { version, isNewVersion } = VersionControlService.peekNextExportVersion();
    const data = await this.compileFullSystemJSON({ exportSequence: version });

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
          onProgress(Math.round(((i + 1) / totalMedia) * 85));
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
      exportSequence: version,
      isNewVersion,
      exportedAt: data.exportedAt,
      summary: data.summary,
      filesArchived: totalMedia,
      versionHistory: data.versionHistory
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 4. Human-readable readme
    const readme = `=====================================================
HISTÓRIAS QUE ROLAMOS - BACKUP COMPLETO DO SISTEMA
=====================================================
Versão da Exportação : v${version}
Status da Versão     : ${isNewVersion ? 'Nova versão gerada' : 'Versão mantida (sem novas alterações)'}
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

    // 6. Commit version control state
    VersionControlService.commitExport(data.summary);

    // 7. Download ZIP
    const { dateStr, timeStr } = this.getFormattedTimestamp();
    const filename = `historias_que_rolamos_completo_v${version}_${dateStr}_${timeStr}.zip`;
    this.triggerDownload(zipBlob, filename);
    return { filename, sequence: version, isNewVersion };
  },

  /**
   * Exports an Incremental Delta ZIP package containing:
   * 1. db.json with complete updated system state.
   * 2. /media folder containing ONLY media created or updated in pending changes!
   * This prevents generating massive ZIP archives when only 1 or 2 images were added.
   */
  async exportDeltaZipBackup(onProgress?: (progress: number) => void): Promise<ExportResult> {
    const zip = new JSZip();

    const { version, isNewVersion } = VersionControlService.peekNextExportVersion();
    const data = await this.compileFullSystemJSON({ exportSequence: version });

    zip.file('db.json', JSON.stringify(data, null, 2));

    // Identificação profunda e abrangente de mídias novas ou alteradas nesta versão:
    // 1. Mídias registradas diretamente no log de pendências
    // 2. Tokens inseridos/alterados (captura token.mediaId)
    // 3. Personagens com novo avatar (imageId), ficha (sheetMediaId) ou galeria (relatedCharacterId)
    // 4. Memórias com nova capa (imageId) ou fotos anexadas (relatedMemoryId)
    // 5. Capa de campanha (coverImageId)
    // 6. Segurança temporal: mídias criadas após a data do último backup exportado
    const pendingChanges = VersionControlService.getPendingChanges();
    const modifiedMediaIds = new Set<string>();

    for (const change of pendingChanges) {
      if (change.action === 'delete') continue;

      if (change.entityType === 'media') {
        modifiedMediaIds.add(change.entityId);
      } else if (change.entityType === 'token') {
        const token = await db.tokens.get(change.entityId);
        if (token?.mediaId) modifiedMediaIds.add(token.mediaId);
      } else if (change.entityType === 'character') {
        const char = await db.characters.get(change.entityId);
        if (char?.imageId) modifiedMediaIds.add(char.imageId);
        if (char?.sheetMediaId) modifiedMediaIds.add(char.sheetMediaId);
        const related = await db.media.filter(m => m.relatedCharacterId === change.entityId).toArray();
        for (const r of related) modifiedMediaIds.add(r.id);
      } else if (change.entityType === 'memory') {
        const mem = await db.memories.get(change.entityId);
        if (mem?.imageId) modifiedMediaIds.add(mem.imageId);
        const related = await db.media.filter(m => m.relatedMemoryId === change.entityId).toArray();
        for (const r of related) modifiedMediaIds.add(r.id);
      } else if (change.entityType === 'campaign') {
        const camp = await db.campaigns.get(change.entityId);
        if (camp?.coverImageId) modifiedMediaIds.add(camp.coverImageId);
      }
    }

    // Camada de segurança temporal
    const versionHistory = VersionControlService.getVersionHistory();
    const lastExportDate = versionHistory[0]?.exportedAt;
    if (lastExportDate) {
      const recentMedia = await db.media
        .filter(m => !!m.createdAt && m.createdAt >= lastExportDate)
        .toArray();
      for (const rm of recentMedia) {
        modifiedMediaIds.add(rm.id);
      }
    } else if (pendingChanges.length > 0 && modifiedMediaIds.size === 0) {
      const allMedia = await db.media.toArray();
      for (const m of allMedia) {
        modifiedMediaIds.add(m.id);
      }
    }

    const mediaToPack = modifiedMediaIds.size > 0
      ? await db.media.where('id').anyOf(Array.from(modifiedMediaIds)).toArray()
      : [];

    const totalMedia = mediaToPack.length;
    const mediaFolder = zip.folder('media');

    if (mediaFolder && totalMedia > 0) {
      for (let i = 0; i < totalMedia; i++) {
        const item = mediaToPack[i];
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

    const manifest = {
      appName: 'Histórias que Rolamos',
      backupFormat: 'incremental-delta-archive',
      version: '2.0.0',
      exportSequence: version,
      isNewVersion,
      exportedAt: data.exportedAt,
      summary: data.summary,
      filesArchived: totalMedia,
      versionHistory: data.versionHistory
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    if (onProgress) onProgress(88);
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (metadata) => {
      if (onProgress) {
        onProgress(88 + Math.round(metadata.percent * 0.12));
      }
    });

    VersionControlService.commitExport(data.summary);

    const { dateStr, timeStr } = this.getFormattedTimestamp();
    const filename = `historias_que_rolamos_delta_v${version}_${dateStr}_${timeStr}.zip`;

    this.triggerDownload(zipBlob, filename);
    return { filename, sequence: version, isNewVersion };
  },

  /**
   * Backwards-compatible wrapper for single campaign ZIP export or full system ZIP.
   */
  async exportFullZipBackup(campaignId?: string, onProgress?: (progress: number) => void): Promise<ExportResult> {
    if (!campaignId) {
      return await this.exportFullSystemZipBackup(onProgress);
    }

    const allCampaigns = await db.campaigns.toArray();
    if (allCampaigns.length <= 1) {
      return await this.exportFullSystemZipBackup(onProgress);
    }

    const zip = new JSZip();
    const { version, isNewVersion } = VersionControlService.peekNextExportVersion();
    const data = await this.compileJSONData(campaignId);
    data.exportSequence = version;

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

    VersionControlService.commitExport(data.summary);

    const campaignName = data.campaigns[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'campanha';
    const { dateStr, timeStr } = this.getFormattedTimestamp();
    const filename = `memoria_completa_${campaignName}_v${version}_${dateStr}_${timeStr}.zip`;

    this.triggerDownload(zipBlob, filename);
    return { filename, sequence: version, isNewVersion };
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
   * Overwrites ALL previously registered data in IndexedDB completely.
   * Resets pending changes to 0 and adopts imported version.
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
    if (sequence === 0) sequence = 1;

    // Set backup version source on campaigns for traceability
    for (const camp of campaigns) {
      if (filename) {
        camp.lastImportedFrom = filename;
      }
      camp.version = sequence;
    }

    const campaignIds = campaigns.map(c => c.id);

    const validCharIds = new Set(characters.map((c: any) => c.id));
    const validMemIds = new Set(memories.map((m: any) => m.id));
    const validTokenIds = new Set(tokens.map((t: any) => t.id));
    const validMediaIds = new Set(mediaMetadata.map((m: any) => m.id));

    // Smart Upsert & Declarative Reconciliation:
    // 1. Preserva imagens e binários existentes no IndexedDB.
    // 2. Remove de forma cirúrgica apenas as entidades que foram excluídas na nova versão.
    // 3. Atualiza campanhas, fichas, memórias e tokens sem perder arquivos locais.
    await db.transaction('rw', [db.campaigns, db.characters, db.memories, db.tokens, db.memoryCharacters, db.media], async () => {
      // Reconciliação de exclusões para as campanhas importadas
      for (const camp of campaigns) {
        const localChars = await db.characters.where('campaignId').equals(camp.id).toArray();
        for (const lc of localChars) {
          if (!validCharIds.has(lc.id)) await db.characters.delete(lc.id);
        }

        const localMems = await db.memories.where('campaignId').equals(camp.id).toArray();
        for (const lm of localMems) {
          if (!validMemIds.has(lm.id)) await db.memories.delete(lm.id);
        }

        const localTokens = await db.tokens.where('campaignId').equals(camp.id).toArray();
        for (const lt of localTokens) {
          if (!validTokenIds.has(lt.id)) await db.tokens.delete(lt.id);
        }

        const localMedia = await db.media.where('campaignId').equals(camp.id).toArray();
        for (const lmed of localMedia) {
          if (!validMediaIds.has(lmed.id)) await db.media.delete(lmed.id);
        }
      }

      if (campaigns.length > 0) await db.campaigns.bulkPut(campaigns);
      if (characters.length > 0) await db.characters.bulkPut(characters);
      if (memories.length > 0) await db.memories.bulkPut(memories);
      if (tokens.length > 0) await db.tokens.bulkPut(tokens);
      if (memoryCharacters.length > 0) await db.memoryCharacters.bulkPut(memoryCharacters);

      if (mediaMetadata.length > 0) {
        for (const meta of mediaMetadata) {
          const existing = await db.media.get(meta.id);
          if (existing && existing.blob && existing.blob.size > 0) {
            // Preserva o binário já existente intacto no banco local!
            await db.media.put({
              ...meta,
              blob: existing.blob,
              thumbnail: existing.thumbnail || existing.blob
            });
          } else if (existing) {
            await db.media.put({
              ...existing,
              ...meta
            });
          } else {
            // Nova referência de mídia sem arquivo físico prévio neste dispositivo
            const fallbackMedia: Media = {
              ...meta,
              blob: new Blob([], { type: meta.mimeType || 'application/octet-stream' }),
              thumbnail: new Blob([], { type: meta.mimeType || 'application/octet-stream' })
            };
            await db.media.put(fallbackMedia);
          }
        }
      }
    });

    // Reset pending changes to 0 and sync version history from backup
    VersionControlService.syncFromImport(sequence, backup.versionHistory);

    // Record last import info
    if (filename) {
      const info: LastImportInfo = {
        sequence,
        filename,
        importedAt: new Date().toISOString(),
        campaignsCount: campaigns.length,
        charactersCount: characters.length,
        memoriesCount: memories.length,
        tokensCount: tokens.length,
        mediaCount: mediaMetadata.length
      };
      localStorage.setItem(STORAGE_KEY_LAST_IMPORT, JSON.stringify(info));
    }

    return { campaignIds, sequence };
  },

  /**
   * Extracts and restores a full campaign/system archive from a ZIP file.
   * Reads db.json, fetches media files, regenerates canvas thumbnails, and commits to IndexedDB.
   * Overwrites ALL previously registered data in IndexedDB completely.
   * Resets pending changes to 0 and adopts imported version.
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
    if (sequence === 0) sequence = 1;

    for (const camp of campaigns) {
      camp.lastImportedFrom = file.name;
      camp.version = sequence;
    }

    const campaignIds = campaigns.map(c => c.id);

    // 3. Pre-process media files and rebuild thumbnails OUTSIDE the database transaction
    const totalMedia = metadataList.length;
    const preparedMediaRecords: Media[] = [];

    for (let i = 0; i < totalMedia; i++) {
      const meta = metadataList[i];
      const fileExt = meta.filename.split('.').pop() || 'bin';
      
      // Busca flexível do arquivo de mídia dentro do pacote ZIP
      let zipFile = zip.file(`media/${meta.id}.${fileExt}`)
                 || zip.file(`media/${meta.id}`)
                 || zip.file(`${meta.id}.${fileExt}`)
                 || zip.file(`${meta.id}`);

      if (!zipFile) {
        const matches = zip.file(new RegExp(`(^|/)${meta.id}(\\.[^/]+)?$`, 'i'));
        if (matches && matches.length > 0) {
          zipFile = matches[0];
        }
      }

      const mime = meta.mimeType || 'image/png';
      let blob = new Blob([], { type: mime });
      let thumbnailBlob = blob;

      if (zipFile) {
        const rawBlob = await zipFile.async('blob');
        blob = new Blob([rawBlob], { type: mime });
        thumbnailBlob = blob;

        // Re-generate thumbnail if it's an image
        if (mime.startsWith('image/') && mime !== 'image/svg+xml' && blob.size > 0) {
          try {
            const imgFile = new File([blob], meta.filename || 'imagem.png', { type: mime });
            thumbnailBlob = await generateThumbnail(imgFile);
          } catch {
            thumbnailBlob = blob;
          }
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

    const validCharIds = new Set(characters.map((c: any) => c.id));
    const validMemIds = new Set(memories.map((m: any) => m.id));
    const validTokenIds = new Set(tokens.map((t: any) => t.id));
    const validMediaIds = new Set(metadataList.map((m: any) => m.id));

    // 4. Smart Upsert & Declarative Reconciliation:
    if (onProgress) onProgress(85);
    await db.transaction('rw', [db.campaigns, db.characters, db.memories, db.tokens, db.memoryCharacters, db.media], async () => {
      // Reconciliação de exclusões para as campanhas importadas
      for (const camp of campaigns) {
        const localChars = await db.characters.where('campaignId').equals(camp.id).toArray();
        for (const lc of localChars) {
          if (!validCharIds.has(lc.id)) await db.characters.delete(lc.id);
        }

        const localMems = await db.memories.where('campaignId').equals(camp.id).toArray();
        for (const lm of localMems) {
          if (!validMemIds.has(lm.id)) await db.memories.delete(lm.id);
        }

        const localTokens = await db.tokens.where('campaignId').equals(camp.id).toArray();
        for (const lt of localTokens) {
          if (!validTokenIds.has(lt.id)) await db.tokens.delete(lt.id);
        }

        const localMedia = await db.media.where('campaignId').equals(camp.id).toArray();
        for (const lmed of localMedia) {
          if (!validMediaIds.has(lmed.id)) await db.media.delete(lmed.id);
        }
      }

      if (campaigns.length > 0) await db.campaigns.bulkPut(campaigns);
      if (characters.length > 0) await db.characters.bulkPut(characters);
      if (memories.length > 0) await db.memories.bulkPut(memories);
      if (tokens.length > 0) await db.tokens.bulkPut(tokens);
      if (memoryCharacters.length > 0) await db.memoryCharacters.bulkPut(memoryCharacters);

      for (const mediaRecord of preparedMediaRecords) {
        if (mediaRecord.blob.size === 0) {
          const existing = await db.media.get(mediaRecord.id);
          if (existing && existing.blob && existing.blob.size > 0) {
            mediaRecord.blob = existing.blob;
            mediaRecord.thumbnail = existing.thumbnail || existing.blob;
          }
        }
        await db.media.put(mediaRecord);
      }
    });

    if (onProgress) onProgress(100);

    // Reset pending changes to 0 and sync version history from backup
    VersionControlService.syncFromImport(sequence, backupData.versionHistory);

    // Record last import info
    const info: LastImportInfo = {
      sequence,
      filename: file.name,
      importedAt: new Date().toISOString(),
      campaignsCount: campaigns.length,
      charactersCount: characters.length,
      memoriesCount: memories.length,
      tokensCount: tokens.length,
      mediaCount: preparedMediaRecords.length
    };
    localStorage.setItem(STORAGE_KEY_LAST_IMPORT, JSON.stringify(info));

    return { campaignIds, sequence };
  }
};
