import type { RawCell } from './types';

/**
 * A cell as the text a form field would hold: numbers in plain notation,
 * dates as `YYYY-MM-DD`, empty as an empty string. Validation then reads it the
 * same way it reads something typed by hand.
 *
 * @param cell - The raw cell.
 */
export const cellToText = (cell: RawCell | undefined): string => {
  if (!cell || cell.kind === 'empty') return '';
  if (cell.kind === 'number') return String(cell.value);

  return cell.value.trim();
};

/**
 * Whether a cell holds nothing (empty or only spaces).
 *
 * @param cell - The raw cell.
 */
export const isBlank = (cell: RawCell | undefined): boolean =>
  cellToText(cell) === '';
