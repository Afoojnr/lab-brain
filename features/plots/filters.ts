import { parseDecimal } from '@/lib/numbers';

import type { PlotColumn, PlotFilter, PlotRow } from './types';

/** Whether a filter restricts anything yet. */
export const isFilterActive = (filter: PlotFilter) =>
  filter.type === 'values'
    ? filter.values.length > 0
    : parseDecimal(filter.min) !== null || parseDecimal(filter.max) !== null;

const passes = (row: PlotRow, filter: PlotFilter): boolean => {
  const value = row.values[filter.key];
  if (!isFilterActive(filter)) return true;
  if (value === undefined) return false;
  if (filter.type === 'values') return filter.values.includes(value);
  if (typeof value !== 'number') return false;

  const min = parseDecimal(filter.min);
  const max = parseDecimal(filter.max);

  return (min === null || value >= min) && (max === null || value <= max);
};

/**
 * Keeps the rows that pass every active filter ("and"), and counts the rest.
 *
 * @param rows - The rows to filter.
 * @param filters - The filters; one that restricts nothing yet is ignored.
 */
export const applyFilters = (
  rows: PlotRow[],
  filters: PlotFilter[]
): { rows: PlotRow[]; filteredOut: number } => {
  const kept = rows.filter(row => filters.every(filter => passes(row, filter)));

  return { rows: kept, filteredOut: rows.length - kept.length };
};

/**
 * The distinct values a column holds, numbers ascending and text A to Z, for a
 * filter to offer. Empty text is not a value.
 */
export const distinctValues = (
  rows: PlotRow[],
  key: string
): (number | string)[] => {
  const values = new Set<number | string>();
  for (const row of rows) {
    const value = row.values[key];
    if (value !== undefined && value !== '') values.add(value);
  }

  return [...values].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b), undefined, { numeric: true })
  );
};

/**
 * The active filters as short lines for a caption: `Cycles: 600, 800`,
 * `Temperature (°C): 150 – 250` (or `≥ 150`, `≤ 250` for one bound). No
 * words, so it reads the same in any language.
 */
export const describeFilters = (
  filters: PlotFilter[],
  columns: Pick<PlotColumn, 'key' | 'name' | 'unit'>[]
): string[] =>
  filters.filter(isFilterActive).flatMap(filter => {
    const column = columns.find(item => item.key === filter.key);
    if (!column) return [];

    const name = column.unit ? `${column.name} (${column.unit})` : column.name;
    if (filter.type === 'values') {
      return [`${name}: ${filter.values.join(', ')}`];
    }

    const min = parseDecimal(filter.min);
    const max = parseDecimal(filter.max);
    if (min !== null && max !== null) return [`${name}: ${min} – ${max}`];

    return [min !== null ? `${name}: ≥ ${min}` : `${name}: ≤ ${max}`];
  });
