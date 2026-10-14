import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { buttonVariants } from '@/components/ui/button';

import { listSavedPlots } from '../data/saved-plots';
import { describeFilters } from '../compute/filters';
import { columnLabel } from '../style/column-label';
import { loadExperimentTable } from '../compute/load-experiment';
import { PREVIEW_SIZE } from '../style/preview-size';
import { restoreSaved } from '../compute/restore';
import { DeleteSavedPlotButton } from './delete-saved-plot-button';
import { LazySavedPlotFigure } from './lazy-saved-plot-figure';

type SavedPlotCardsProps = {
  projectId: string;
  experimentId: string;
};

/**
 * An experiment's saved plots as cards on its page: a small live preview, the
 * title, what is plotted and the filters.
 */
export const SavedPlotCards = async ({
  projectId,
  experimentId
}: SavedPlotCardsProps) => {
  const [t, tExport, plots, table] = await Promise.all([
    getTranslations('plots.saved'),
    getTranslations('plots.export'),
    listSavedPlots(experimentId),
    loadExperimentTable(projectId, experimentId)
  ]);
  const base = `/plots?source=experiment&project=${projectId}&experiment=${experimentId}`;

  if (plots.length === 0) {
    return (
      <div className="grid gap-2">
        <p className="text-muted-foreground text-sm">{t('cardsEmpty')}</p>
        <Link
          href={base}
          className="w-fit text-sm underline underline-offset-4"
        >
          {t('openPlots')}
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <li
            key={plot.id}
            className="grid min-w-0 content-start gap-3 rounded-xl border p-3"
          >
            <div className="flex justify-center overflow-hidden">
              <LazySavedPlotFigure
                table={table}
                plot={plot}
                size={PREVIEW_SIZE}
              />
            </div>
            <div className="grid gap-1">
              <h3 className="font-medium">{plot.name}</h3>
              {x && y && (
                <p className="text-muted-foreground text-sm">
                  {tExport('title', {
                    y: columnLabel(y),
                    x: columnLabel(x)
                  })}
                </p>
              )}
              {filterLines.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {filterLines.join(' · ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`${base}&plot=${plot.id}`}
                aria-label={t('open', { name: plot.name })}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {t('openShort')}
              </Link>
              <DeleteSavedPlotButton
                projectId={projectId}
                experimentId={experimentId}
                plot={{ id: plot.id, name: plot.name }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
