import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupService } from '../services/backup';
import { db } from '../db';

const mockQuery = (data: any) => ({
  equals: vi.fn().mockReturnThis(),
  anyOf: vi.fn().mockReturnThis(),
  toArray: vi.fn().mockResolvedValue(data)
});

// Mock IndexedDB tables using Vitest
vi.mock('../db', () => {
  return {
    db: {
      campaigns: { where: vi.fn() },
      characters: { where: vi.fn() },
      memories: { where: vi.fn() },
      tokens: { where: vi.fn() },
      memoryCharacters: { where: vi.fn() },
      media: { where: vi.fn() }
    }
  };
});

describe('Backup & Export Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('compileJSONData', () => {
    it('should query all DB tables and build a validated schema without binary buffers', async () => {
      // Setup mock returns
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
        thumbnailBlob: new Blob(['rawbinarythumb'], { type: 'image/png' }),
        isGallery: true
      };

      vi.mocked(db.campaigns.where).mockReturnValue(mockQuery([mockCampaign]) as any);
      vi.mocked(db.characters.where).mockReturnValue(mockQuery([mockChar]) as any);
      vi.mocked(db.memories.where).mockReturnValue(mockQuery([mockMem]) as any);
      vi.mocked(db.tokens.where).mockReturnValue(mockQuery([mockTok]) as any);
      vi.mocked(db.memoryCharacters.where).mockReturnValue(mockQuery([mockMChar]) as any);
      vi.mocked(db.media.where).mockReturnValue(mockQuery([mockMedia]) as any);

      const backup = await BackupService.compileJSONData('c1');

      // Verify DB compilation structure
      expect(backup.version).toBe('1.0.0');
      expect(backup.campaigns).toContainEqual(mockCampaign);
      expect(backup.characters).toContainEqual(mockChar);
      expect(backup.memories).toContainEqual(mockMem);
      expect(backup.tokens).toContainEqual(mockTok);
      expect(backup.memoryCharacters).toContainEqual(mockMChar);

      // Verify binary properties are removed from media metadata array
      expect(backup.mediaMetadata).toHaveLength(1);
      const meta = backup.mediaMetadata[0];
      expect(meta.id).toBe('img1');
      expect(meta.filename).toBe('scene.png');
      expect((meta as any).blob).toBeUndefined(); // Should be stripped out for JSON
      expect((meta as any).thumbnailBlob).toBeUndefined(); // Should be stripped out for JSON
    });
  });
});
