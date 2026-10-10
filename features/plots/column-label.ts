import type { PlotColumn } from './types';

/** A column's name with its unit, e.g. `Power (W)`. */
export const columnLabel = (column: Pick<PlotColumn, 'name' | 'unit'>) =>
  column.unit ? `${column.name} (${column.unit})` : column.name;
