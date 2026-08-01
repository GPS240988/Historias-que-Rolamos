export interface Campaign {
  id: string;
  name: string;
  system: string;
  description: string;
  coverImageId?: string;
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  campaignId: string;
  playerName: string;
  name: string;
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
  updatedAt: string;
}

export interface Memory {
  id: string;
  campaignId: string;
  title: string;
  description: string; // Relato Narrativo Mestre
  descriptionRhodgar?: string; // Relato Narrativo Rhodgar
  descriptionErnest?: string; // Relato Narrativo Ernest
  eventDate: string; // ISO date (YYYY-MM-DD) for timeline ordering
  type: MemoryType;
  imageId?: string;
  characterIds: string[]; // Tagged characters (many-to-many inline)
  tags: string[]; // List of tags (many-to-many inline)
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
  width: number;
  height: number;
  blob: Blob; // High quality image blob
  thumbnailBlob: Blob; // 300x300 thumbnail blob
  title?: string; // Optional gallery image title
  description?: string; // Optional gallery description
  eventDate?: string; // Optional creation/event date
  relatedCharacterId?: string; // Optional link to character
  relatedMemoryId?: string; // Optional link to memory
  tags?: string[]; // Optional tags list
  isGallery?: boolean; // Flag to filter user direct uploads in the gallery
  createdAt: string;
}

export interface Token {
  id: string;
  campaignId: string;
  name: string;
  category: TokenCategory;
  mediaId: string; // Reference to Media
  relatedCharacterId?: string; // Reference to Character
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type TokenCategory = "Player Character" | "NPC" | "Enemy";


// Full Campaign Backup structure (JSON part)
export interface MemoryCharacter {
  id: string;
  memoryId: string;
  characterId: string;
  levelReached?: number;
}

export interface CampaignBackup {
  version: string;
  campaigns: Campaign[];
  characters: Character[];
  memories: Memory[];
  memoryCharacters: MemoryCharacter[];
  tokens: Token[];
  mediaMetadata: Omit<Media, 'blob' | 'thumbnailBlob'>[];
}

