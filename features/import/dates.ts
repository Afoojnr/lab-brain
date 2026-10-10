import { isCalendarDate } from '@/features/experiments/shared';

import { isBlank } from '@/lib/spreadsheet/cells';
import type { RawCell } from './types';

/** How a date written as text is read: `YYYY-MM-DD`, day first or month first. */
export type DateFormat = 'iso' | 'dmy' | 'mdy';

const SLASHED_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

/**
 * Turns a date written as text into `YYYY-MM-DD` using the chosen format.
 * Anything that does not fit is returned as it was, so validation reports it
 * instead of the import guessing a date.
 *
 * @param text - The cell's text.
 * @param format - How the sheet writes dates.
 */
export const normaliseDate = (text: string, format: DateFormat): string => {
  const trimmed = text.trim();
  if (isCalendarDate(trimmed) || format === 'iso') return trimmed;

  const match = SLASHED_DATE.exec(trimmed);
  if (!match) return trimmed;

  const [, first = '', second = '', year = ''] = match;
  const day = format === 'dmy' ? first : second;
  const month = format === 'dmy' ? second : first;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Whether the date column holds dates written as text (not Excel dates or
 * `YYYY-MM-DD`), which is when the user must say how to read them.
 *
 * @param cells - The date column's cells below the header.
 */
export const hasAmbiguousDates = (cells: RawCell[]): boolean =>
  cells.some(
    cell =>
      cell.kind === 'text' &&
      !isBlank(cell) &&
      !isCalendarDate(cell.value.trim())
  );
