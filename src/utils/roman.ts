/**
 * Converte numerais arábicos (1 a 3999) para numerais romanos clássicos (I a MMMCMXCIX).
 * Utilizado para numeração editorial de capítulos, fólios e seções do Tomo Sagrado.
 */
export const toRomanNumeral = (num: number): string => {
  const romanLookup: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let n = Math.max(1, Math.min(3999, Math.floor(num)));
  let result = '';
  for (const [val, sym] of romanLookup) {
    while (n >= val) {
      result += sym;
      n -= val;
    }
  }
  return result;
};

/**
 * Calcula o número canônico do capítulo de uma sessão de acordo com o total de memórias
 * e a ordenação atual da lista ('desc' = mais recentes primeiro; 'asc' = mais antigas primeiro).
 * 
 * Regra diegética e editorial de RPG:
 * - A primeira sessão jogada no tempo da campanha é SEMPRE a Crônica I (Prólogo/Gênese).
 * - A última sessão jogada (mais recente) é SEMPRE a Crônica N (onde N é o total de registros).
 * - Portanto, ao abrir na exibição padrão ('desc' - mais recente primeiro), o primeiro registro (índice 0)
 *   é exibido como Crônica N (ex: Crônica XII para 12 sessões), mantendo a fidelidade cronológica absoluta.
 */
export const getChronologicalChapterNumber = (
  index: number,
  totalCount: number,
  sortOrder: 'asc' | 'desc' = 'desc'
): number => {
  if (totalCount <= 0) return 1;
  const safeIndex = Math.max(0, Math.min(totalCount - 1, index));
  return sortOrder === 'desc' ? totalCount - safeIndex : safeIndex + 1;
};
