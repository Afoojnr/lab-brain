import {
  getProjectById,
  listCharacterizationsByExperiment,
  listDerivedColumns,
  listExperimentsByProject,
  listParameterDefinitions,
  listSamplesByExperiment,
  listStudiesByExperiment
} from '@/features/experiments/server';
import { calculateForSamples } from '@/features/experiments/shared';

import type { ExperimentData } from './queries';

export type ProjectScope = { projectId: string; experimentId?: string };

/**
 * Everything one experiment holds, with its calculated values worked out the
 * same way the tables and reports do.
 */
export const loadExperimentData = async (
  experiment: ExperimentData['experiment']
): Promise<ExperimentData> => {
  const [definitions, derivedColumns, studies, samples, characterizations] =
    await Promise.all([
      listParameterDefinitions(experiment.id),
      listDerivedColumns(experiment.id),
      listStudiesByExperiment(experiment.id),
      listSamplesByExperiment(experiment.id),
      listCharacterizationsByExperiment(experiment.id)
    ]);

  return {
    experiment,
    definitions,
    derivedColumns,
    studies,
    samples,
    characterizations,
    derivedValues: calculateForSamples(definitions, derivedColumns, samples)
  };
};

const normalize = (text: string) => text.trim().toLowerCase();

/**
 * The experiment a question means: by name or code prefix, else the one the
 * chat is scoped to, else the only one in the project.
 */
export const resolveExperiment = async (
  scope: ProjectScope,
  name?: string
): Promise<ExperimentData | { error: string; experiments: string[] }> => {
  const experiments = await listExperimentsByProject(scope.projectId);
  const names = experiments.map(item => item.name);
  const wanted = name?.trim()
    ? experiments.find(
        item =>
          normalize(item.name) === normalize(name) ||
          normalize(item.codePrefix) === normalize(name)
      )
    : (experiments.find(item => item.id === scope.experimentId) ??
      (experiments.length === 1 ? experiments[0] : undefined));

  if (!wanted)
    return {
      error: name?.trim()
        ? `No experiment named "${name}".`
        : 'Say which experiment (name or code prefix).',
      experiments: names
    };

  return loadExperimentData(wanted);
};

export { getProjectById, listExperimentsByProject };
