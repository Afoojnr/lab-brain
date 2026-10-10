import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { ExperimentPicker } from '@/components/experiment-picker';
import {
  getExperimentInProject,
  listExperimentsByProject,
  listNavigation,
  listParameterDefinitions
} from '@/features/experiments/server';

import { getAnalysis, latestTargets } from '../data/analyses';
import { defaultSettings } from '../defaults';
import { loadBatchRows } from '../load-batch';
import type { AnalysisKind } from '../types';
import { ExperimentBatch } from './experiment-batch';

type ExperimentSourceProps = {
  kind: AnalysisKind;
  /** From the URL; ignored when it is not a project or not one that holds the experiment. */
  projectId?: string;
  experimentId?: string;
};

/**
 * The "From an experiment" side of a technique's workspace: pick a project and
 * an experiment, then work on its measurements together. An experiment that
 * does not belong to the chosen project is ignored, never opened.
 */
export const ExperimentSource = async ({
  kind,
  projectId,
  experimentId
}: ExperimentSourceProps) => {
  const [t, tNavigation, { projects }] = await Promise.all([
    getTranslations('analysis.workspace.experiment'),
    getTranslations('navigation'),
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
      basePath={`/characterization/${kind}`}
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

  const [rows, definitions] = await Promise.all([
    loadBatchRows(kind, experiment.id),
    listParameterDefinitions(experiment.id)
  ]);
  const columns = definitions
    .filter(column => column.role === 'result' && column.kind === 'number')
    .map(column => ({ id: column.id, name: column.name, unit: column.unit }));
  const defaults = defaultSettings(kind);
  // The columns the last analysis of this kind used in this experiment, if any.
  const savedTargets = await latestTargets(
    rows.map(row => row.characterizationId),
    kind
  );
  const saved = await Promise.all(
    rows.map(row => getAnalysis(row.characterizationId, kind))
  );
  const initialSelectedIds =
    saved.find(analysis => analysis)?.settings.selectedValueIds ??
    defaults.selectedValueIds;

  return (
    <div className="grid min-w-0 gap-8">
      {picker}
      {rows.length === 0 ? (
        <div className="grid gap-2">
          <p className="text-muted-foreground text-sm">
            {t('noRows', { technique: tNavigation(kind) })}
          </p>
          <Link
            href={`/characterization/${kind}?source=upload`}
            className="text-sm underline underline-offset-4"
          >
            {t('orUpload')}
          </Link>
        </div>
      ) : (
        <ExperimentBatch
          // A new experiment starts fresh; a different one never inherits ticks.
          key={experiment.id}
          projectId={project.id}
          experimentId={experiment.id}
          kind={kind}
          rows={rows}
          columns={columns}
          initialSelectedIds={initialSelectedIds}
          initialTargets={savedTargets}
        />
      )}
    </div>
  );
};
