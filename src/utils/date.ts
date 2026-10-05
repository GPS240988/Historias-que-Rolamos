/**
 * Date Formatting Utility for Chronicles & Memories
 * Prevents timezone offset shifts (e.g. UTC midnight converting to previous day in UTC-3/Brazil).
 */

/**
 * Formats a date string (YYYY-MM-DD or ISO timestamp) into Brazilian format (DD/MM/YYYY)
 * strictly preserving the civil calendar date without timezone shift.
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';

  // Extract YYYY-MM-DD pattern directly from string to avoid UTC conversion shifts
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString('pt-BR');
  } catch {
    return String(dateStr);
  }
}

/**
 * Normalizes a date to YYYY-MM-DD string for form inputs and database storage
 */
export function normalizeDateInput(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().substring(0, 10);
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return dateStr.substring(0, 10);
}
