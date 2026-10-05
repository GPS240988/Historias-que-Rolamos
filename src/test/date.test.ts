import { describe, it, expect } from 'vitest';
import { formatDisplayDate, normalizeDateInput } from '../utils/date';

describe('formatDisplayDate (Timezone-safe)', () => {
  it('should format YYYY-MM-DD correctly without subtracting one day', () => {
    expect(formatDisplayDate('2026-04-10')).toBe('10/04/2026');
    expect(formatDisplayDate('2026-10-05')).toBe('05/10/2026');
    expect(formatDisplayDate('1420-04-10')).toBe('10/04/1420');
  });

  it('should format ISO timestamp without timezone shift', () => {
    expect(formatDisplayDate('2026-04-10T00:00:00.000Z')).toBe('10/04/2026');
    expect(formatDisplayDate('2026-04-10T23:59:59.000Z')).toBe('10/04/2026');
  });

  it('should handle empty or null values gracefully', () => {
    expect(formatDisplayDate('')).toBe('');
    expect(formatDisplayDate(null)).toBe('');
    expect(formatDisplayDate(undefined)).toBe('');
  });

  it('should normalize input dates correctly', () => {
    expect(normalizeDateInput('2026-04-10T00:00:00.000Z')).toBe('2026-04-10');
    expect(normalizeDateInput('2026-04-10')).toBe('2026-04-10');
  });
});
