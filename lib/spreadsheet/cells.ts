import type { RawCell } from './types';

/**
 * A cell as the text a form field would hold: numbers in plain notation, dates
 * as `YYYY-MM-DD`, empty as an empty string.
 */
export const cellToText = (cell: RawCell | undefined): string => {
  if (!cell || cell.kind === 'empty') return '';
  if (cell.kind === 'number') return String(cell.value);

  return cell.value.trim();
};

/** Whether a cell holds nothing (empty or only spaces). */
export const isBlank = (cell: RawCell | undefined): boolean =>
  cellToText(cell) === '';
