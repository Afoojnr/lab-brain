import { defaultSettings } from './default-settings';
import type { PlotColumn, SavedPlot, SavedPlotInput } from './types';

/**
 * The settings, filters and unticked samples to open a saved plot with. A
 * column that has been removed since saving falls back to the default axes (or
 * no grouping or error bars), and a filter on a removed column is dropped, so
 * a saved plot always opens instead of failing.
 *
 * @param columns - The experiment's columns now.
 * @param saved - The saved plot.
 * @returns Null when the experiment no longer has two columns of numbers.
 */
export const restoreSaved = (
  columns: PlotColumn[],
  saved: Pick<SavedPlot, 'settings' | 'filters' | 'untickedIds' | 'style'>
): Omit<SavedPlotInput, 'name'> | null => {
  const defaults = defaultSettings(columns);
  if (!defaults) return null;

  const numberKeys = new Set(
    columns.filter(column => column.kind === 'number').map(item => item.key)
  );
  const keys = new Set(columns.map(column => column.key));
  const { settings } = saved;

  return {
    settings: {
      x: numberKeys.has(settings.x) ? settings.x : defaults.x,
      y: numberKeys.has(settings.y) ? settings.y : defaults.y,
      error:
        settings.error !== null && numberKeys.has(settings.error)
          ? settings.error
          : null,
      group:
        settings.group.type === 'column' && !keys.has(settings.group.key)
          ? { type: 'none' }
          : settings.group,
      logX: settings.logX,
      logY: settings.logY
    },
    filters: saved.filters.filter(filter => keys.has(filter.key)),
    untickedIds: saved.untickedIds,
    style: saved.style
  };
};
