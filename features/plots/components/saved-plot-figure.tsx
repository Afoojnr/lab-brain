'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { computePlot } from '../compute/compute-plot';
import type { PlotTable } from '../compute/from-table';
import { legendTitleFor } from '../style/legend-title';
import { restoreSaved } from '../compute/restore';
import type { SavedPlotInput } from '../types';
import { ScatterPlot } from './scatter-plot';

type SavedPlotFigureProps = {
  table: PlotTable;
  plot: Omit<SavedPlotInput, 'name'>;
  /** A fixed size in pixels, e.g. a small preview; omit to fill the width. */
  size?: { width: number; height: number };
};

/**
 * A saved plot drawn read-only from the experiment's current samples: the same
 * points, filters, colours and look it has on the Plots page, with no tooltip
 * and no clicking. Used by the saved-plot cards and the reports.
 */
export const SavedPlotFigure = ({
  table,
  plot,
  size
}: SavedPlotFigureProps) => {
  const tControls = useTranslations('plots.controls');
  const tSaved = useTranslations('plots.saved');
  const restored = useMemo(
    () => restoreSaved(table.columns, plot),
    [table.columns, plot]
  );
  const computed = useMemo(
    () =>
      restored
        ? computePlot(table, {
            settings: restored.settings,
            filters: restored.filters,
            untickedIds: restored.untickedIds
          })
        : null,
    [table, restored]
  );
  const xColumn = restored
    ? table.columns.find(column => column.key === restored.settings.x)
    : undefined;
  const yColumn = restored
    ? table.columns.find(column => column.key === restored.settings.y)
    : undefined;

  if (!restored || !computed || !xColumn || !yColumn) {
    return (
      <p className="text-muted-foreground text-sm">{tSaved('unavailable')}</p>
    );
  }

  const errorColumn = restored.settings.error
    ? (table.columns.find(column => column.key === restored.settings.error) ??
      null)
    : null;

  return (
    <ScatterPlot
      series={computed.series}
      colorOrder={computed.colorOrder}
      xColumn={xColumn}
      yColumn={yColumn}
      errorColumn={errorColumn}
      logX={restored.settings.logX}
      logY={restored.settings.logY}
      plotStyle={restored.style}
      legendTitle={legendTitleFor(
        restored.settings.group,
        table.columns,
        tControls('groupStudy')
      )}
      size={size}
      isStatic
    />
  );
};
