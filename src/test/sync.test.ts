import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterRepository } from '../repositories/CharacterRepository';
import { SyncEngine } from '../services/sync';
import { db } from '../db';

const mockQuery = (data: any) => ({
  equals: vi.fn().mockReturnThis(),
  anyOf: vi.fn().mockReturnThis(),
  toArray: vi.fn().mockResolvedValue(data),
  first: vi.fn().mockResolvedValue(data[0])
});

// Mock database tables
vi.mock('../db', () => {
  return {
    db: {
      campaigns: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
      characters: { get: vi.fn(), put: vi.fn(), delete: vi.fn(), where: vi.fn() },
      memories: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
      tokens: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
      memoryCharacters: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
      media: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
      sync_outbox: { get: vi.fn(), put: vi.fn(), delete: vi.fn(), add: vi.fn(), where: vi.fn(), update: vi.fn() },
      transaction: vi.fn((_mode, _tables, cb) => cb())
    }
  };
});

// Mock window/navigator properties
global.navigator = {
  onLine: true
} as any;

describe('Synchronization & Conflict Handling Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    localStorage.setItem('cloud_token', 'mock-token');
    localStorage.setItem('activeCampaignId', 'c1');
    global.fetch = vi.fn();
    vi.mocked(db.sync_outbox.where).mockImplementation(() => mockQuery([]) as any);
  });

  describe('Outbox Integration', () => {
    it('should queue pending CREATE mutation in outbox when saving new character', async () => {
      const newChar = {
        id: 'char1',
        campaignId: 'c1',
        playerName: 'Test Player',
        name: 'Arkon',
        class: 'Guerreiro',
        level: 1,
        hp: 12,
        mp: 6,
        characterType: 'hero' as const,
        race: 'Humano',
        origin: 'Gladiador',
        concept: 'Combatente',
        description: '',
        notes: '',
        createdAt: '2026-01-01T00:00:00Z'
      };

      vi.mocked(db.characters.get).mockResolvedValue(undefined); // Simulated brand new character
      vi.mocked(db.sync_outbox.add).mockResolvedValue(1);

      await CharacterRepository.save(newChar);

      // Verify character put locally
      expect(db.characters.put).toHaveBeenCalledWith(expect.objectContaining({
        id: 'char1',
        version: 0
      }));

      // Verify outbox entry queued
      expect(db.sync_outbox.add).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'character',
        entityId: 'char1',
        operation: 'CREATE',
        baseVersion: 0
      }));
    });
  });

  describe('SyncEngine Push & Conflicts', () => {
    it('should resolve outbox items successfully if server has no conflicts', async () => {
      const mockOutboxItem = {
        id: 1,
        entityType: 'character',
        entityId: 'char1',
        operation: 'UPDATE',
        baseVersion: 5,
        payload: { id: 'char1', name: 'Arkon II', version: 5 }
      };

      // Mock outbox list
      vi.mocked(db.sync_outbox.where).mockReturnValue({
        anyOf: vi.fn().mockReturnThis(),
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([mockOutboxItem])
      } as any);
      vi.mocked(db.sync_outbox.get).mockResolvedValue(mockOutboxItem as any);

      // Mock fetch server response (Success)
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: [{ outboxId: 1, status: 'success', serverVersion: 6 }]
        })
      });
      global.fetch = mockFetch;

      vi.mocked(db.characters.get).mockResolvedValue({ id: 'char1', name: 'Arkon II', version: 5 });

      await SyncEngine.pushLocalChanges();

      // Verify local version bumped to server version
      expect(db.characters.put).toHaveBeenCalledWith(expect.objectContaining({
        id: 'char1',
        version: 6
      }));

      // Verify outbox cleared
      expect(db.sync_outbox.delete).toHaveBeenCalledWith(1);
    });

    it('should catch conflict on stale updates and update outbox status', async () => {
      const mockOutboxItem = {
        id: 2,
        entityType: 'character',
        entityId: 'char1',
        operation: 'UPDATE',
        baseVersion: 5,
        payload: { id: 'char1', name: 'Arkon Local', version: 5 }
      };

      vi.mocked(db.sync_outbox.where).mockReturnValue({
        anyOf: vi.fn().mockReturnThis(),
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([mockOutboxItem])
      } as any);
      vi.mocked(db.sync_outbox.get).mockResolvedValue(mockOutboxItem as any);

      const serverPayload = { id: 'char1', name: 'Arkon Server', version: 8 };

      // Mock conflict response from Server
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: [{ outboxId: 2, status: 'conflict', serverVersion: 8, serverPayload }]
        })
      });
      global.fetch = mockFetch;

      await SyncEngine.pushLocalChanges();

      // Verify local character NOT updated (keeps edit)
      expect(db.characters.put).not.toHaveBeenCalled();

      // Verify outbox updated with conflict status & server payload
      expect(db.sync_outbox.update).toHaveBeenCalledWith(2, expect.objectContaining({
        status: 'conflict',
        serverVersion: 8,
        serverPayload
      }));
    });
  });
});
