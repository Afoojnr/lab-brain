import { parseDecimal } from '../numbers';
import { isBlank } from './cells';
import type { RawCell } from './types';

/**
 * The first row with at least two text cells, taken as the header. A title
 * line above the table, with one cell, is skipped. The user can change it.
 *
 * @param rows - The sheet's rows.
 * @returns The zero-based index of the header row (0 when none stands out).
 */
export const detectHeaderRow = (rows: RawCell[][]): number => {
  const index = rows.findIndex(
    row => row.filter(cell => cell.kind === 'text').length >= 2
  );

  return index === -1 ? 0 : index;
};

/**
 * Splits a header such as "Plasma power (W)" or "Temperature [°C]" into its
 * name and unit. A header with no unit keeps its whole text as the name.
 *
 * @param header - The header text.
 */
export const splitHeaderUnit = (
  header: string
): { name: string; unit: string } => {
  const match = /^(.*?)\s*[([]([^()[\]]+)[)\]]\s*$/.exec(header.trim());
  const name = match?.[1]?.trim();
  if (!match || !name) return { name: header.trim(), unit: '' };

  return { name, unit: match[2]?.trim() ?? '' };
};

/**
 * Whether a column looks like numbers or text, as a suggestion only. Text that
 * reads as a number ("1,5") counts as a number; a column with nothing in it is
 * suggested as text, which accepts anything.
 *
 * @param cells - The column's cells below the header.
 */
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

/**
 * The cells of one source column below the header row.
 *
 * @param rows - The sheet's rows.
 * @param headerRow - Index of the header row.
 * @param column - Zero-based column index.
 */
export const columnCells = (
  rows: RawCell[][],
  headerRow: number,
  column: number
): RawCell[] =>
  rows.slice(headerRow + 1).map(row => row[column] ?? { kind: 'empty' });
