import { getTranslations } from 'next-intl/server';

import { columnLabel } from '../column-label';
import { listSavedPlots } from '../data/saved-plots';
import { describeFilters } from '../filters';
import { loadExperimentTable } from '../load-experiment';
import { restoreSaved } from '../restore';
import { SavedPlotFigure } from './saved-plot-figure';

/** A figure on paper: wide enough to read, short enough that two fit a page. */
const FIGURE_SIZE = { width: 640, height: 340 };

type SavedPlotsReportProps = {
  projectId: string;
  experimentId: string;
  /** Written when the experiment has no saved plots. */
  emptyText: string;
};

/**
 * An experiment's saved plots as figures for a report: each with its title,
 * what is plotted and its filters, drawn from the current samples. A figure is
 * never split across pages.
 */
export const SavedPlotsReport = async ({
  projectId,
  experimentId,
  emptyText
}: SavedPlotsReportProps) => {
  const [tExport, tFigure, plots, table] = await Promise.all([
    getTranslations('plots.export'),
    getTranslations('reports.figure'),
    listSavedPlots(experimentId),
    loadExperimentTable(projectId, experimentId)
  ]);
  if (plots.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  }

  return (
    <div className="grid gap-6">
      {plots.map(plot => {
        const restored = restoreSaved(table.columns, plot);
        const x = restored
          ? table.columns.find(column => column.key === restored.settings.x)
          : undefined;
        const y = restored
          ? table.columns.find(column => column.key === restored.settings.y)
          : undefined;
        const filterLines = restored
          ? describeFilters(restored.filters, table.columns)
          : [];

        return (
          <figure key={plot.id} className="grid gap-2">
            <figcaption className="grid gap-0.5">
              <span className="font-medium">{plot.name}</span>
              {x && y && (
                <span className="text-muted-foreground text-sm">
                  {tExport('title', { y: columnLabel(y), x: columnLabel(x) })}
                </span>
              )}
              {filterLines.length > 0 && (
                <span className="text-muted-foreground text-xs">
                  {tFigure('filters', { list: filterLines.join(' · ') })}
                </span>
              )}
            </figcaption>
            <div className="overflow-hidden">
              <SavedPlotFigure table={table} plot={plot} size={FIGURE_SIZE} />
            </div>
          </figure>
        );
      })}
    </div>
  );
};
