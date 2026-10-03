import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupService } from '../services/backup';
import { VersionControlService } from '../services/versionControl';
import { db } from '../db';

// Mock IndexedDB tables using Vitest
const { createTableMock } = vi.hoisted(() => {
  const createTableMock = () => ({
    where: vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([])
      }),
      anyOf: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([])
      })
    }),
    filter: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([])
    }),
    toArray: vi.fn().mockResolvedValue([]),
    bulkPut: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined)
  });
  return { createTableMock };
});

vi.mock('../db', () => {
  return {
    db: {
      campaigns: createTableMock(),
      characters: createTableMock(),
      memories: createTableMock(),
      tokens: createTableMock(),
      memoryCharacters: createTableMock(),
      media: createTableMock(),
      clearAll: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn().mockImplementation(async (_mode, _tables, callback) => {
        return await callback();
      })
    }
  };
});

describe('VersionControlService & BackupService (Offline-First)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('VersionControlService change-tracking logic', () => {
    it('should start at v1 and detect pending changes when actions are logged', () => {
      expect(VersionControlService.getCurrentVersion()).toBe(1);
      expect(VersionControlService.hasPendingChanges()).toBe(false);

      VersionControlService.logChange('create', 'character', 'c1', 'Arkon', 'Herói Arkon criado');

      expect(VersionControlService.hasPendingChanges()).toBe(true);
      expect(VersionControlService.getPendingChanges()).toHaveLength(1);
      expect(VersionControlService.getPendingChanges()[0].entityName).toBe('Arkon');
    });

    it('should NOT increment version upon export when there are NO pending changes after an import', () => {
      // Simulate importing v3 from another user / device
      VersionControlService.syncFromImport(3);

      expect(VersionControlService.getCurrentVersion()).toBe(3);
      expect(VersionControlService.hasPendingChanges()).toBe(false);

      // Peek next version without making any edits
      const peek = VersionControlService.peekNextExportVersion();
      expect(peek.version).toBe(3);
      expect(peek.isNewVersion).toBe(false);

      // Commit export with no changes
      const commit = VersionControlService.commitExport({
        campaignsCount: 1,
        charactersCount: 2,
        memoriesCount: 3,
        tokensCount: 1,
        memoryCharactersCount: 2,
        mediaCount: 1
      });

      expect(commit.version).toBe(3);
      expect(commit.isNewVersion).toBe(false);
      expect(VersionControlService.getCurrentVersion()).toBe(3);
    });

    it('should increment version when changes ARE made after an import', () => {
      // User B imports v3
      VersionControlService.syncFromImport(3);

      // User B adds a new memory on their device
      VersionControlService.logChange('create', 'memory', 'm1', 'Batalha dos Tronos', 'Memória registrada');
      expect(VersionControlService.hasPendingChanges()).toBe(true);

      // Peek next version: should be v4!
      const peek = VersionControlService.peekNextExportVersion();
      expect(peek.version).toBe(4);
      expect(peek.isNewVersion).toBe(true);

      // Commit export
      const commit = VersionControlService.commitExport({
        campaignsCount: 1,
        charactersCount: 2,
        memoriesCount: 4,
        tokensCount: 1,
        memoryCharactersCount: 2,
        mediaCount: 1
      });

      expect(commit.version).toBe(4);
      expect(commit.isNewVersion).toBe(true);
      expect(VersionControlService.getCurrentVersion()).toBe(4);
      // Pending changes should now be cleared
      expect(VersionControlService.hasPendingChanges()).toBe(false);

      // History should have the v4 record
      const history = VersionControlService.getVersionHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].version).toBe(4);
      expect(history[0].changes[0].entityName).toBe('Batalha dos Tronos');
    });
  });

  describe('parseSequenceFromFilename', () => {
    it('should parse sequence number from various filename formats', () => {
      expect(BackupService.parseSequenceFromFilename('historias_que_rolamos_v3_2026-10-03_120000.json')).toBe(3);
      expect(BackupService.parseSequenceFromFilename('backup-v12-2026.zip')).toBe(12);
      expect(BackupService.parseSequenceFromFilename('backup_v05.json')).toBe(5);
      expect(BackupService.parseSequenceFromFilename('unversioned_file.json')).toBeNull();
    });
  });

  describe('compileFullSystemJSON', () => {
    it('should sweep all tables across the system, include version history and strip binary blobs', async () => {
      const mockCampaign = { id: 'c1', name: 'Aliança Negra', system: 'Tormenta20', startDate: '2026-01-01' };
      const mockChar = { id: 'ch1', name: 'Arkon', class: 'Guerreiro', level: 2 };
      const mockMem = { id: 'm1', title: 'O Fim da Catedral', characterIds: ['ch1'], tags: ['Batalha'] };
      const mockTok = { id: 't1', name: 'Monstro Esqueleto', category: 'Enemy' };
      const mockMChar = { memoryId: 'm1', characterId: 'ch1', levelReached: 2 };
      const mockMedia = {
        id: 'img1',
        campaignId: 'c1',
        filename: 'scene.png',
        mimeType: 'image/png',
        size: 5000,
        width: 1920,
        height: 1080,
        blob: new Blob(['rawbinaryoriginal'], { type: 'image/png' }),
        thumbnail: new Blob(['rawbinarythumb'], { type: 'image/png' }),
        isGallery: true
      };

      vi.mocked(db.campaigns.toArray).mockResolvedValue([mockCampaign as any]);
      vi.mocked(db.characters.toArray).mockResolvedValue([mockChar as any]);
      vi.mocked(db.memories.toArray).mockResolvedValue([mockMem as any]);
      vi.mocked(db.tokens.toArray).mockResolvedValue([mockTok as any]);
      vi.mocked(db.memoryCharacters.toArray).mockResolvedValue([mockMChar as any]);
      vi.mocked(db.media.toArray).mockResolvedValue([mockMedia as any]);

      const backup = await BackupService.compileFullSystemJSON();

      expect(backup.format).toBe('historias-que-rolamos-backup');
      expect(backup.summary.campaignsCount).toBe(1);
      expect(backup.summary.charactersCount).toBe(1);
      expect(backup.summary.memoriesCount).toBe(1);
      expect(backup.summary.tokensCount).toBe(1);
      expect(backup.summary.mediaCount).toBe(1);

      expect(backup.mediaMetadata[0].id).toBe('img1');
      expect((backup.mediaMetadata[0] as any).blob).toBeUndefined();
      expect((backup.mediaMetadata[0] as any).thumbnail).toBeUndefined();
    });
  });

  describe('importJSONData', () => {
    it('should perform smart upsert, preserve existing media blobs without wiping database, and adopt version with zero pending changes', async () => {
      const existingMedia = {
        id: 'img1',
        campaignId: 'c1',
        filename: 'foto_antiga.png',
        mimeType: 'image/png',
        size: 5000,
        blob: new Blob(['bytes_existentes'], { type: 'image/png' }),
        thumbnail: new Blob(['thumb_existente'], { type: 'image/png' }),
        isGallery: true,
        createdAt: '2026-01-01T00:00:00Z'
      };

      vi.mocked(db.media.get).mockResolvedValue(existingMedia as any);

      const mockBackup = {
        format: 'historias-que-rolamos-backup',
        version: '2.0.0',
        exportSequence: 5,
        versionHistory: [
          {
            version: 5,
            exportedAt: '2026-10-03T12:00:00Z',
            summary: { totalChanges: 1, campaignsCount: 1, charactersCount: 1, memoriesCount: 0, tokensCount: 0, mediaCount: 1 },
            changes: [
              { id: '1', timestamp: '2026-10-03T12:00:00Z', action: 'create', entityType: 'character', entityId: 'ch1', entityName: 'Lorde', description: 'Lorde criado' }
            ]
          }
        ],
        campaigns: [{ id: 'c1', name: 'Nova Campanha', system: 'Tormenta20' }],
        characters: [{ id: 'ch1', name: 'Lorde' }],
        memories: [],
        tokens: [],
        memoryCharacters: [],
        mediaMetadata: [
          {
            id: 'img1',
            campaignId: 'c1',
            filename: 'foto_antiga.png',
            mimeType: 'image/png',
            size: 5000,
            title: 'Título Atualizado no JSON',
            isGallery: true,
            createdAt: '2026-01-01T00:00:00Z'
          }
        ]
      };

      const result = await BackupService.importJSONData(mockBackup, 'backup_v5.json');

      // Do NOT clear existing database!
      expect(db.clearAll).not.toHaveBeenCalled();
      expect(db.campaigns.bulkPut).toHaveBeenCalled();
      expect(db.characters.bulkPut).toHaveBeenCalled();
      expect(db.media.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'img1',
          title: 'Título Atualizado no JSON',
          blob: existingMedia.blob,
          thumbnail: existingMedia.thumbnail
        })
      );
      expect(result.sequence).toBe(5);

      // Verify version adopted and NO pending changes exist
      expect(VersionControlService.getCurrentVersion()).toBe(5);
      expect(VersionControlService.hasPendingChanges()).toBe(false);

      // An immediate export must NOT increment version
      const peek = VersionControlService.peekNextExportVersion();
      expect(peek.version).toBe(5);
      expect(peek.isNewVersion).toBe(false);
    });
  });

  describe('exportDeltaZipBackup', () => {
    it('should deeply resolve media from changed tokens, characters, and memories and pack them in delta zip', async () => {
      // Setup mock data in DB
      const mockToken = { id: 't1', name: 'Monstro Token', mediaId: 'media_token_1' };
      const mockChar = { id: 'ch1', name: 'Mago', imageId: 'media_avatar_1', sheetMediaId: 'media_sheet_1' };
      const mockMem = { id: 'm1', title: 'Aventura', imageId: 'media_cover_1' };

      vi.mocked(db.tokens.get).mockResolvedValue(mockToken as any);
      vi.mocked(db.characters.get).mockResolvedValue(mockChar as any);
      vi.mocked(db.memories.get).mockResolvedValue(mockMem as any);

      const mockPackedMedia = [
        { id: 'media_token_1', filename: 'token.png', blob: new Blob(['t'], { type: 'image/png' }) },
        { id: 'media_avatar_1', filename: 'avatar.png', blob: new Blob(['a'], { type: 'image/png' }) },
        { id: 'media_cover_1', filename: 'cover.png', blob: new Blob(['c'], { type: 'image/png' }) }
      ];

      vi.mocked(db.media.where).mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockPackedMedia)
        }),
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([])
        })
      } as any);

      // Simulate version 1 already finalized
      localStorage.setItem('export_version_finalized', 'true');

      // Log changes on token, character and memory
      VersionControlService.logChange('create', 'token', 't1', 'Monstro Token', 'Token criado');
      VersionControlService.logChange('update', 'character', 'ch1', 'Mago', 'Avatar do Mago alterado');
      VersionControlService.logChange('create', 'memory', 'm1', 'Aventura', 'Memória criada');

      const triggerDownloadSpy = vi.spyOn(BackupService, 'triggerDownload').mockImplementation(() => {});

      const result = await BackupService.exportDeltaZipBackup();

      expect(result.sequence).toBe(2);
      expect(result.isNewVersion).toBe(true);
      expect(result.filename).toContain('historias_que_rolamos_delta_v2');
      expect(triggerDownloadSpy).toHaveBeenCalled();
    });
  });
});
