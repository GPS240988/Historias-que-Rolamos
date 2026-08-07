import Dexie, { type Table } from 'dexie';
import type { Campaign, Character, Memory, Media, Token, MemoryCharacter, SyncOutbox } from '../types';

export class ChronicleDatabase extends Dexie {
  campaigns!: Table<Campaign, string>;
  characters!: Table<Character, string>;
  memories!: Table<Memory, string>;
  media!: Table<Media, string>;
  tokens!: Table<Token, string>;
  memoryCharacters!: Table<MemoryCharacter, string>;
  sync_outbox!: Table<SyncOutbox, number>;

  constructor() {
    super('ChroniclesOfTheJourney');

    // Table schemas:
    // First field is primary key.
    // Subsequent fields are indexed.
    // Asterisk (*) prefix indicates multi-entry array indices.
    this.version(2).stores({
      campaigns: 'id',
      characters: 'id, campaignId, name, class, origin',
      memories: 'id, campaignId, eventDate, *characterIds, *tags',
      media: 'id, campaignId',
      tokens: 'id, campaignId, category, relatedCharacterId',
      memoryCharacters: 'id, memoryId, characterId, levelReached',
      sync_outbox: '++id, entityType, entityId, status'
    });
  }

  /**
   * Resets all tables to clean state
   */
  async clearAll() {
    await this.transaction(
      'rw',
      [this.campaigns, this.characters, this.memories, this.media, this.tokens, this.memoryCharacters, this.sync_outbox],
      async () => {
        await this.campaigns.clear();
        await this.characters.clear();
        await this.memories.clear();
        await this.media.clear();
        await this.tokens.clear();
        await this.memoryCharacters.clear();
        await this.sync_outbox.clear();
      }
    );
  }
}

export const db = new ChronicleDatabase();
