import { describe, it, expect } from 'vitest';

// Simulating character and memory list filtering logic used in the application
interface Character {
  name: string;
  class: string;
  race: string;
  origin: string;
  playerName: string;
}

interface Memory {
  title: string;
  description: string;
  tags: string[];
}

function filterCharacters(list: Character[], query: string): Character[] {
  if (!query.trim()) return list;
  const q = query.toLowerCase().trim();
  return list.filter(char => 
    char.name.toLowerCase().includes(q) ||
    char.class.toLowerCase().includes(q) ||
    char.race.toLowerCase().includes(q) ||
    char.origin.toLowerCase().includes(q) ||
    char.playerName.toLowerCase().includes(q)
  );
}

function filterMemories(list: Memory[], query: string): Memory[] {
  if (!query.trim()) return list;
  const q = query.toLowerCase().trim();
  return list.filter(mem => 
    mem.title.toLowerCase().includes(q) ||
    mem.description.toLowerCase().includes(q) ||
    mem.tags.some(t => t.toLowerCase().includes(q))
  );
}

describe('Search Query Filter Engine', () => {
  const characters: Character[] = [
    { name: 'Arkon', class: 'Guerreiro', race: 'Humano', origin: 'Guarda', playerName: 'Bob' },
    { name: 'Lysandra', class: 'Clériga', race: 'Qareen', origin: 'Acólita', playerName: 'Alice' },
    { name: 'Grom', class: 'Bárbaro', race: 'Lefeou', origin: 'Selvagem', playerName: 'Charlie' }
  ];

  const memories: Memory[] = [
    { title: 'O Fim da Catedral', description: 'Uma batalha campal no altar sacrílego contra o sacerdote corrompido.', tags: ['Masmorra', 'Chefe'] },
    { title: 'Taverna do Javali', description: 'Um momento engraçado de repouso e bebida com mercadores.', tags: ['Social', 'Descanso'] }
  ];

  describe('filterCharacters', () => {
    it('should match character name case-insensitively', () => {
      const results = filterCharacters(characters, 'arkon');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Arkon');
    });

    it('should match class or race keywords', () => {
      const results = filterCharacters(characters, 'Clériga');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Lysandra');
      
      const resultsRace = filterCharacters(characters, 'Lefeou');
      expect(resultsRace).toHaveLength(1);
      expect(resultsRace[0].name).toBe('Grom');
    });

    it('should return all characters if query is empty', () => {
      const results = filterCharacters(characters, '   ');
      expect(results).toHaveLength(3);
    });

    it('should return empty list if no matches found', () => {
      const results = filterCharacters(characters, 'Ladino');
      expect(results).toHaveLength(0);
    });
  });

  describe('filterMemories', () => {
    it('should match title keywords', () => {
      const results = filterMemories(memories, 'Catedral');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('O Fim da Catedral');
    });

    it('should match tag tags list', () => {
      const results = filterMemories(memories, 'Descanso');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Taverna do Javali');
    });

    it('should search description text details', () => {
      const results = filterMemories(memories, 'sacerdote');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('O Fim da Catedral');
    });
  });
});
