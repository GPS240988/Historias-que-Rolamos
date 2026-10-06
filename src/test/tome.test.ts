import { describe, it, expect } from 'vitest';
import { toRomanNumeral, getChronologicalChapterNumber } from '../utils/roman';

describe('Tomo Sagrado - Conversor de Numerais Romanos Editoriais', () => {
  it('converte corretamente números básicos (1 a 10)', () => {
    expect(toRomanNumeral(1)).toBe('I');
    expect(toRomanNumeral(2)).toBe('II');
    expect(toRomanNumeral(3)).toBe('III');
    expect(toRomanNumeral(4)).toBe('IV');
    expect(toRomanNumeral(5)).toBe('V');
    expect(toRomanNumeral(6)).toBe('VI');
    expect(toRomanNumeral(7)).toBe('VII');
    expect(toRomanNumeral(8)).toBe('VIII');
    expect(toRomanNumeral(9)).toBe('IX');
    expect(toRomanNumeral(10)).toBe('X');
  });

  it('converte corretamente marcos históricos de capítulos longos', () => {
    expect(toRomanNumeral(14)).toBe('XIV');
    expect(toRomanNumeral(40)).toBe('XL');
    expect(toRomanNumeral(50)).toBe('L');
    expect(toRomanNumeral(85)).toBe('LXXXV');
    expect(toRomanNumeral(99)).toBe('XCIX');
    expect(toRomanNumeral(100)).toBe('C');
    expect(toRomanNumeral(150)).toBe('CL');
  });

  it('mantém limites seguros para valores menores que 1 e maiores que 3999', () => {
    expect(toRomanNumeral(0)).toBe('I');
    expect(toRomanNumeral(-10)).toBe('I');
    expect(toRomanNumeral(4000)).toBe('MMMCMXCIX');
  });
});

describe('Tomo Sagrado - Numeração Canônica Cronológica de RPG', () => {
  it('em ordem decrescente (desc / mais novas primeiro), a última sessão jogada (índice 0) recebe o maior número de crônica', () => {
    const totalMemories = 12;
    // O primeiro registro exibido (mais novo/ontem) é a Crônica XII
    const newestChapter = getChronologicalChapterNumber(0, totalMemories, 'desc');
    expect(newestChapter).toBe(12);
    expect(toRomanNumeral(newestChapter)).toBe('XII');

    // O segundo registro exibido é a Crônica XI
    const secondChapter = getChronologicalChapterNumber(1, totalMemories, 'desc');
    expect(secondChapter).toBe(11);
    expect(toRomanNumeral(secondChapter)).toBe('XI');

    // O último registro exibido (início da campanha) é a Crônica I
    const oldestChapter = getChronologicalChapterNumber(11, totalMemories, 'desc');
    expect(oldestChapter).toBe(1);
    expect(toRomanNumeral(oldestChapter)).toBe('I');
  });

  it('em ordem crescente (asc / mais antigas primeiro), o índice 0 é a Crônica I e o último é a Crônica N', () => {
    const totalMemories = 12;
    const firstChapter = getChronologicalChapterNumber(0, totalMemories, 'asc');
    expect(firstChapter).toBe(1);
    expect(toRomanNumeral(firstChapter)).toBe('I');

    const lastChapter = getChronologicalChapterNumber(11, totalMemories, 'asc');
    expect(lastChapter).toBe(12);
    expect(toRomanNumeral(lastChapter)).toBe('XII');
  });
});
