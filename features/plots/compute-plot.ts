import { applyFilters } from './filters';
import type { PlotTable } from './from-table';
import { buildSeries, foldSeries } from './plot-model';
import { MAX_STYLED_GROUPS } from './series-style';
import type {
  LeftOut,
  PlotFilter,
  PlotPoint,
  PlotSeries,
  PlotSettings
} from './types';

export type ComputedPlot = {
  /** The series to draw: filtered, unticked samples removed, extra groups folded. */
  series: PlotSeries[];
  foldedCount: number;
  /** The series before folding, for the numbers export. */
  chosenSeries: PlotSeries[];
  /** Group keys of the whole table, so a group keeps its look while others are filtered out. */
  colorOrder: string[];
  /** Every sample that could be plotted, ticked or not: the list to choose from. */
  points: PlotPoint[];
  plotted: number;
  leftOut: LeftOut;
  filteredOut: number;
};

/**
 * Everything a plot shows, worked out from a table and what to plot: the
 * filters keep some samples, unticked samples are taken off, samples with no
 * number are left out and counted, and groups beyond what can be styled are
 * folded. The plot page, the saved-plot cards and the reports all use this, so
 * the same plot always shows the same points.
 *
 * @param table - The columns and rows.
 * @param options - What to plot, the filters and the unticked sample ids.
 */
export const computePlot = (
  table: PlotTable,
  options: {
    settings: PlotSettings;
    filters: PlotFilter[];
    untickedIds: string[];
  }
): ComputedPlot => {
  const { settings, filters, untickedIds } = options;
  const filtered = applyFilters(table.rows, filters);
  const candidates = buildSeries(filtered.rows, settings);
  const chosen = buildSeries(
    filtered.rows.filter(row => !untickedIds.includes(row.id)),
    settings
  );
  // Colours follow the groups of the whole table, so filtering or unticking
  // never repaints the groups that stay.
  const colorOrder = buildSeries(table.rows, settings).series.map(
    series => series.key
  );
  const points = [
    ...new Map(
      candidates.series
        .flatMap(series => series.points)
        .map(point => [point.rowId, point])
    ).values()
  ];

  return {
    ...foldSeries(chosen.series, MAX_STYLED_GROUPS, colorOrder),
    chosenSeries: chosen.series,
    colorOrder,
    points,
    plotted: chosen.plotted,
    leftOut: candidates.leftOut,
    filteredOut: filtered.filteredOut
  };
};
