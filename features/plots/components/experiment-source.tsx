import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { ExperimentPicker } from '@/components/experiment-picker';
import {
  getExperimentInProject,
  listExperimentsByProject,
  listNavigation
} from '@/features/experiments/server';

import { listSavedPlots } from '../data/saved-plots';
import { loadExperimentTable } from '../load-experiment';
import { restoreSaved } from '../restore';
import { PlotView } from './plot-view';
import { SavedPlotsList } from './saved-plots-list';

type ExperimentSourceProps = {
  /** From the URL; ignored when it is not a project or not one that holds the experiment. */
  projectId?: string;
  experimentId?: string;
  /** From the URL: plot only these samples (ids that are not in the experiment are ignored). */
  sampleIds?: string[];
  /** From the URL: a saved plot of this experiment to open. */
  plotId?: string;
};

/**
 * The "From an experiment" side of the plots workspace: pick a project and an
 * experiment, then plot its samples (or just the ones ticked in its table).
 */
export const ExperimentSource = async ({
  projectId,
  experimentId,
  sampleIds,
  plotId
}: ExperimentSourceProps) => {
  const [t, { projects }] = await Promise.all([
    getTranslations('plots.experiment'),
    listNavigation()
  ]);
  const project = projects.find(item => item.id === projectId);
  const experiments = project ? await listExperimentsByProject(project.id) : [];
  const experiment =
    project && experimentId
      ? await getExperimentInProject(project.id, experimentId)
      : undefined;

  const picker = (
    <ExperimentPicker
      basePath="/plots"
      labels={{
        project: t('projectLabel'),
        experiment: t('experimentLabel'),
        chooseProject: t('chooseProject'),
        chooseExperiment: t('chooseExperiment')
      }}
      projects={projects}
      experiments={experiments}
      projectId={project?.id ?? null}
      experimentId={experiment?.id ?? null}
    />
  );

  if (!project || !experiment) {
    return (
      <div className="grid gap-4">
        {picker}
        <p className="text-muted-foreground text-sm">
          {projects.length === 0
            ? t('noProjects')
            : project && experiments.length === 0
              ? t('noExperiments')
              : t('pickHint')}
        </p>
      </div>
    );
  }

  const [table, savedPlots] = await Promise.all([
    loadExperimentTable(project.id, experiment.id, sampleIds),
    listSavedPlots(experiment.id)
  ]);
  const openPlot = savedPlots.find(plot => plot.id === plotId);
  // A saved plot keeps its own samples (unticked ones), so a selection from the table does not apply.
  const restored = openPlot ? restoreSaved(table.columns, openPlot) : null;
  const tSaved = await getTranslations('plots.saved');
  const isSelection = sampleIds !== undefined && sampleIds.length > 0;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      {picker}
      <SavedPlotsList
        projectId={project.id}
        experimentId={experiment.id}
        plots={savedPlots.map(plot => ({ id: plot.id, name: plot.name }))}
        openId={openPlot?.id ?? null}
      />
      {openPlot && !restored && (
        <p className="text-muted-foreground text-sm">{tSaved('unavailable')}</p>
      )}
      {isSelection && (
        <p className="text-sm">
          {t('selected', { count: table.rows.length })} ·{' '}
          <Link
            href={`/plots?source=experiment&project=${project.id}&experiment=${experiment.id}`}
            className="underline underline-offset-4"
          >
            {t('showAll')}
          </Link>
        </p>
      )}
      {table.rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noSamples')}</p>
      ) : (
        <PlotView
          // Another experiment or selection has other columns and rows.
          key={`${experiment.id}:${sampleIds?.join(',') ?? ''}:${openPlot?.id ?? ''}`}
          table={table}
          canGroupByStudy
          initial={restored ?? undefined}
          save={{
            projectId: project.id,
            experimentId: experiment.id,
            open:
              openPlot && restored
                ? { id: openPlot.id, name: openPlot.name }
                : undefined,
            otherNames: savedPlots.map(plot => plot.name)
          }}
          sourceLabel={`${project.name} · ${experiment.name}`}
          notEnoughNumbers={t('tooFewNumbers')}
        />
      )}
    </div>
  );
};
