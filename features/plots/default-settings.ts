import type { PlotColumn, PlotSettings } from './types';

/**
 * Starting axes. For an experiment, the first result (or calculated) column on
 * Y, since that is usually what is plotted, and the first parameter on X; for
 * an uploaded table (no roles), its first two columns of numbers. Null when
 * there are fewer than two columns of numbers (nothing to plot).
 */
export const defaultSettings = (columns: PlotColumn[]): PlotSettings | null => {
  const numbers = columns.filter(column => column.kind === 'number');
  if (numbers.length < 2) return null;

  const y =
    numbers.find(
      column => column.role === 'result' || column.role === 'calculated'
    ) ?? numbers[1];
  const x =
    numbers.find(column => column.role === 'parameter' && column !== y) ??
    numbers.find(column => column !== y) ??
    numbers[0];

  return {
    x: x.key,
    y: y.key,
    error: null,
    group: { type: 'none' },
    logX: false,
    logY: false
  };
};
