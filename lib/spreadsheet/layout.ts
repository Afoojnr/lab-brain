import { parseDecimal } from '@/lib/numbers/numbers';
import { isBlank } from './cells';
import type { RawCell } from './types';

/** The first row with at least two text cells, taken as the header. */
export const detectHeaderRow = (rows: RawCell[][]): number => {
  const index = rows.findIndex(
    row => row.filter(cell => cell.kind === 'text').length >= 2
  );

  return index === -1 ? 0 : index;
};

/**
 * Splits a header such as "Plasma power (W)" or "Temperature [°C]" into its
 * name and unit.
 */
export const splitHeaderUnit = (
  header: string
): { name: string; unit: string } => {
  const match = /^(.*?)\s*[([]([^()[\]]+)[)\]]\s*$/.exec(header.trim());
  const name = match?.[1]?.trim();
  if (!match || !name) return { name: header.trim(), unit: '' };

  return { name, unit: match[2]?.trim() ?? '' };
};

/** Whether a column looks like numbers or text, as a suggestion only. */
export const guessKind = (cells: RawCell[]): 'number' | 'text' => {
  const filled = cells.filter(cell => !isBlank(cell));
  if (filled.length === 0) return 'text';

  const isNumeric = filled.every(cell =>
    cell.kind === 'number'
      ? true
      : cell.kind === 'text' && parseDecimal(cell.value) !== null
  );

  return isNumeric ? 'number' : 'text';
};

/** The cells of one source column below the header row. */
export const columnCells = (
  rows: RawCell[][],
  headerRow: number,
  column: number
): RawCell[] =>
  rows.slice(headerRow + 1).map(row => row[column] ?? { kind: 'empty' });
