import type { AnalysisValue, ColumnTarget } from './types';

export type ResultColumn = { id: string; name: string; unit: string | null };

/**
 * Where a value goes: what the user chose if that column still exists,
 * otherwise a result column with the same name as the value, otherwise a new
 * column named after the value.
 *
 * @param value - The analysis value.
 * @param saved - The user's earlier choice for it, if any.
 * @param columns - The experiment's number result columns.
 */
export const resolveTarget = (
  value: AnalysisValue,
  saved: ColumnTarget | undefined,
  columns: ResultColumn[]
): ColumnTarget => {
  if (saved?.type === 'new') return saved;
  if (
    saved?.type === 'column' &&
    columns.some(column => column.id === saved.columnId)
  ) {
    return saved;
  }

  const sameName = columns.find(
    column =>
      column.name.trim().toLowerCase() === value.label.trim().toLowerCase()
  );

  return sameName
    ? { type: 'column', columnId: sameName.id }
    : { type: 'new', name: value.label, unit: value.unit ?? '' };
};

export type SelectionProblem = 'none' | 'columnTaken' | 'nameMissing';

/**
 * Whether the chosen values can be sent: at least one, no two into the same
 * column, and every new column named. The server checks all of this again.
 *
 * @param selected - The chosen values with where each goes.
 */
export const checkSelection = (
  selected: { value: AnalysisValue; target: ColumnTarget }[]
): SelectionProblem | null => {
  if (selected.length === 0) return 'none';

  const columnIds = selected.flatMap(({ target }) =>
    target.type === 'column' ? [target.columnId] : []
  );
  if (new Set(columnIds).size !== columnIds.length) return 'columnTaken';
  if (
    selected.some(
      ({ target }) => target.type === 'new' && target.name.trim() === ''
    )
  ) {
    return 'nameMissing';
  }

  return null;
};

/**
 * What a number looks like in the preview: up to 6 significant digits, enough
 * to compare without drowning the table (the stored value keeps full precision).
 */
export const formatValue = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 6,
    useGrouping: false
  }).format(value);
