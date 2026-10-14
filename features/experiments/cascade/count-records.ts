import { listCharacterizationsBySample } from '../data/characterizations';
import { listDerivedColumns } from '../data/derived-columns';
import { listDatasetsByCharacterization } from '../data/datasets';
import { listExperimentsByProject } from '../data/experiments';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { listSamplesByExperiment } from '../data/samples';
import { listStudiesByExperiment } from '../data/studies';

export type Counts = {
  experiments: number;
  samples: number;
  characterizations: number;
  files: number;
  columns: number;
  studies: number;
};

const NONE: Counts = {
  experiments: 0,
  samples: 0,
  characterizations: 0,
  files: 0,
  columns: 0,
  studies: 0
};

const add = (a: Counts, b: Counts): Counts => ({
  experiments: a.experiments + b.experiments,
  samples: a.samples + b.samples,
  characterizations: a.characterizations + b.characterizations,
  files: a.files + b.files,
  columns: a.columns + b.columns,
  studies: a.studies + b.studies
});

/** What deleting a sample takes with it: its measurements and their files. */
export const countSample = async (sampleId: string): Promise<Counts> => {
  const characterizations = await listCharacterizationsBySample(sampleId);
  let files = 0;
  for (const item of characterizations) {
    files += (await listDatasetsByCharacterization(item.id)).length;
  }

  return {
    ...NONE,
    samples: 1,
    characterizations: characterizations.length,
    files
  };
};

/** What deleting an experiment takes with it: samples, measurements, files, columns (entered and calculated) and studies. */
export const countExperiment = async (
  experimentId: string
): Promise<Counts> => {
  let total: Counts = { ...NONE, experiments: 1 };
  for (const sample of await listSamplesByExperiment(experimentId)) {
    total = add(total, await countSample(sample.id));
  }
  const [definitions, derived, studies] = await Promise.all([
    listParameterDefinitions(experimentId),
    listDerivedColumns(experimentId),
    listStudiesByExperiment(experimentId)
  ]);

  return {
    ...total,
    columns: definitions.length + derived.length,
    studies: studies.length
  };
};

/** What deleting a project takes with it, over all its experiments. */
export const countProject = async (projectId: string): Promise<Counts> => {
  let total: Counts = { ...NONE };
  for (const experiment of await listExperimentsByProject(projectId)) {
    total = add(total, await countExperiment(experiment.id));
  }

  return total;
};
