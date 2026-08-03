export interface Campaign {
  id: string;
  name: string;
  system: string;
  description: string;
  coverImageId?: string;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  lastImportedFrom?: string;
}

export interface CharacterEvolution {
  id: string;
  date: string; // ISO date format YYYY-MM-DD
  comment: string;
  author: string; // Who made the comment ("Mestre" or a character name)
  memoryId?: string; // Linked memory/adventure
}

export interface Character {
  id: string;
  campaignId: string;
  playerName: string;
  name: string;
  characterType: 'hero' | 'ally';
  race: string;
  origin: string; // First-class search field
  class: string;
  level: number;
  hp: number;
  mp: number;
  imageId?: string;
  sheetMediaId?: string; // Character sheet/document attachment
  concept: string;
  description: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
  evolutions?: CharacterEvolution[];
}

export interface MemoryComment {
  id: string;
  date: string; // ISO date format YYYY-MM-DD
  comment: string;
  author: string; // Who made the comment ("Mestre" or a character name)
}

export interface Memory {
  id: string;
  campaignId: string;
  title: string;
  description: string; // Relato Narrativo Mestre
  heroDescriptions?: Record<string, string>; // Relatos Narrativos por ID do Herói
  eventDate: string; // ISO date (YYYY-MM-DD) for timeline ordering
  type: MemoryType;
  imageId?: string;
  characterIds: string[]; // Tagged characters (many-to-many inline)
  tags: string[]; // List of tags (many-to-many inline)
  comments?: MemoryComment[]; // Inline comments on this memory
  createdAt: string;
  updatedAt: string;
}

export type MemoryType =
  | "Batalha"
  | "Vitória"
  | "Derrota"
  | "Descoberta"
  | "Relacionamento"
  | "Tragédia"
  | "Conquista"
  | "Interpretação"
  | "Exploração"
  | "Conhecimento"
  | "Momento Engraçado"
  | "Momento Lendário";

export interface Media {
  id: string;
  campaignId: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  blob: Blob;
  thumbnail?: Blob;
  title?: string;
  description?: string;
  eventDate?: string;
  relatedCharacterId?: string;
  relatedMemoryId?: string;
  tags?: string[];
  isGallery: boolean;
  createdAt: string;
}

export interface MemoryCharacter {
  id: string;
  memoryId: string;
  characterId: string;
  levelReached?: number;
}

export interface Token {
  id: string;
  campaignId: string;
  name: string;
  mediaId: string;
  category: 'Player Character' | 'NPC' | 'Enemy';
  relatedCharacterId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Full Campaign Backup structure (JSON part)
export interface CampaignBackup {
  version: string;
  campaigns: Campaign[];
  characters: Character[];
  memories: Memory[];
  memoryCharacters: MemoryCharacter[];
  tokens: Token[];
  mediaMetadata: Omit<Media, 'blob' | 'thumbnail'>[];
}
