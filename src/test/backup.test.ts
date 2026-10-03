import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupService } from '../services/backup';
import { db } from '../db';

// Mock IndexedDB tables using Vitest
vi.mock('../db', () => {
  return {
    db: {
      campaigns: { where: vi.fn(), toArray: vi.fn(), bulkPut: vi.fn() },
      characters: { where: vi.fn(), toArray: vi.fn(), bulkPut: vi.fn() },
      memories: { where: vi.fn(), toArray: vi.fn(), bulkPut: vi.fn() },
      tokens: { where: vi.fn(), toArray: vi.fn(), bulkPut: vi.fn() },
      memoryCharacters: { where: vi.fn(), toArray: vi.fn(), bulkPut: vi.fn() },
      media: { where: vi.fn(), toArray: vi.fn(), put: vi.fn() },
      clearAll: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn().mockImplementation(async (_mode, _tables, callback) => {
        return await callback();
      })
    }
  };
});

describe('Backup & Export Service (Offline-First)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Versioning helpers', () => {
    it('should increment export sequence version sequentially', () => {
      expect(BackupService.getCurrentExportSequence()).toBe(0);
      expect(BackupService.getNextExportSequence()).toBe(1);
      expect(BackupService.getNextExportSequence()).toBe(2);
      expect(BackupService.getCurrentExportSequence()).toBe(2);
    });

    it('should parse sequence number from various filename formats', () => {
      expect(BackupService.parseSequenceFromFilename('historias_que_rolamos_v3_2026-10-03_120000.json')).toBe(3);
      expect(BackupService.parseSequenceFromFilename('backup-v12-2026.zip')).toBe(12);
      expect(BackupService.parseSequenceFromFilename('backup_v05.json')).toBe(5);
      expect(BackupService.parseSequenceFromFilename('unversioned_file.json')).toBeNull();
    });

    it('should sync sequence counter when higher version is imported', () => {
      BackupService.getNextExportSequence(); // 1
      BackupService.syncExportSequence(10, 'backup_v10.zip');
      expect(BackupService.getCurrentExportSequence()).toBe(10);
      expect(BackupService.getNextExportSequence()).toBe(11);
    });
  });

  describe('compileFullSystemJSON', () => {
    it('should sweep all tables across the system and strip binary blobs', async () => {
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
      expect(backup.exportSequence).toBe(1);
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
    it('should clear existing database completely before restoring imported data', async () => {
      const mockBackup = {
        format: 'historias-que-rolamos-backup',
        version: '2.0.0',
        exportSequence: 5,
        campaigns: [{ id: 'c1', name: 'Nova Campanha', system: 'Tormenta20' }],
        characters: [{ id: 'ch1', name: 'Lorde' }],
        memories: [],
        tokens: [],
        memoryCharacters: [],
        mediaMetadata: []
      };

      const result = await BackupService.importJSONData(mockBackup, 'backup_v5.json');

      expect(db.clearAll).toHaveBeenCalledTimes(1);
      expect(db.campaigns.bulkPut).toHaveBeenCalled();
      expect(db.characters.bulkPut).toHaveBeenCalled();
      expect(result.sequence).toBe(5);
      expect(BackupService.getCurrentExportSequence()).toBe(5);
    });
  });
});
