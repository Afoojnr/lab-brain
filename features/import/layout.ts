import { parseParameterInput } from '@/features/experiments/shared';
import type { ParameterDefinition } from '@/features/experiments/shared';

import { isBlank } from './cells';
import type { ColumnTarget, RawCell } from './types';

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
      : cell.kind === 'text' &&
        parseParameterInput(cell.value, 'number').isValid
  );

  return isNumeric ? 'number' : 'text';
};

const normalise = (text: string) => text.trim().toLowerCase();

const SINGLE_TARGETS: { type: ColumnTarget['type']; words: string[] }[] = [
  { type: 'code', words: ['sample', 'code', 'id', 'sample id', 'sample code'] },
  { type: 'date', words: ['date'] },
  { type: 'implementation', words: ['implementation'] },
  { type: 'observation', words: ['observation', 'observations'] },
  { type: 'note', words: ['note', 'notes'] },
  { type: 'studies', words: ['study', 'studies'] }
];

/**
 * Suggests what each source column becomes, from its header: the well-known
 * fields by name, an existing column with the same name (ignoring case and
 * unit), and anything else as a new parameter column. Each single-use field
 * (code, date, ...) is suggested for the first matching column only.
 *
 * @param headers - The header texts, one per column.
 * @param columns - The target experiment's columns (empty for a new one).
 * @param sampleCells - For each source column, its cells below the header.
 */
export const suggestMapping = (
  headers: string[],
  columns: Pick<ParameterDefinition, 'id' | 'name'>[],
  sampleCells: RawCell[][]
): ColumnTarget[] => {
  const used = new Set<ColumnTarget['type']>();

  return headers.map((header, index) => {
    const label = normalise(header);
    if (label === '') return { type: 'ignore' };

    const single = SINGLE_TARGETS.find(
      target => !used.has(target.type) && target.words.includes(label)
    );
    if (single) {
      used.add(single.type);
      return { type: single.type } as ColumnTarget;
    }

    const { name, unit } = splitHeaderUnit(header);
    const existing = columns.find(
      column => normalise(column.name) === normalise(name)
    );
    if (existing) return { type: 'column', columnId: existing.id };

    return {
      type: 'newColumn',
      name,
      unit,
      kind: guessKind(sampleCells[index] ?? []),
      role: 'parameter'
    };
  });
};

/**
 * The letters most sample codes start with ("ALD" for ALD001, ALD002), as a
 * suggested prefix. Empty when no clear prefix of 2 to 6 letters exists.
 *
 * @param codes - The sample codes in the sheet.
 */
export const suggestPrefix = (codes: string[]): string => {
  const counts = new Map<string, number>();
  for (const code of codes) {
    const letters = /^[A-Za-z]+/.exec(code.trim())?.[0]?.toUpperCase();
    if (letters) counts.set(letters, (counts.get(letters) ?? 0) + 1);
  }

  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return best && /^[A-Z][A-Z0-9]{1,5}$/.test(best) ? best : '';
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
