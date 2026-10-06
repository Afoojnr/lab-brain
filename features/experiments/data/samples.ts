import type { SampleInput } from '../schemas';
import type { Sample } from '../types';
import { DEMO_SAMPLES } from './demo-samples';
import { listExperimentsByProject } from './experiments';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
const samples: Sample[] = [...DEMO_SAMPLES];

/**
 * An experiment's samples, oldest first, like the rows of a spreadsheet.
 *
 * @param experimentId - Owning experiment's id.
 */
export const listSamplesByExperiment = async (
  experimentId: string
): Promise<Sample[]> =>
  samples
    .filter(sample => sample.experimentId === experimentId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

/**
 * One sample by id.
 *
 * @param id - Sample id.
 * @returns The sample, or undefined when no sample has that id.
 */
export const getSampleById = async (id: string): Promise<Sample | undefined> =>
  samples.find(sample => sample.id === id);

/**
 * Every sample code in a project, across all its experiment, so a new code can be
 * checked and suggested against all of them.
 *
 * @param projectId - Owning project's id.
 */
export const listSampleCodesByProject = async (
  projectId: string
): Promise<string[]> => {
  const experimentIds = new Set(
    (await listExperimentsByProject(projectId)).map(experiment => experiment.id)
  );

  return samples
    .filter(sample => experimentIds.has(sample.experimentId))
    .map(sample => sample.code);
};

/**
 * Whether any sample holds a value for this parameter, which makes it unsafe
 * to delete or to change its kind.
 *
 * @param definitionId - The parameter's id.
 */
export const isParameterInUse = async (
  definitionId: string
): Promise<boolean> => samples.some(sample => definitionId in sample.values);

/**
 * Stores a new sample. Input must already be validated by
 * `buildSampleFormSchema` and converted by `toSampleInput`.
 *
 * @param experimentId - Owning experiment's id.
 * @param input - Validated, converted sample.
 * @returns The stored sample.
 */
export const createSample = async (
  experimentId: string,
  input: SampleInput
): Promise<Sample> => {
  const sample: Sample = {
    id: crypto.randomUUID(),
    experimentId,
    code: input.code,
    performedOn: input.performedOn,
    values: input.values,
    implementation: input.implementation,
    observation: input.observation,
    note: input.note,
    studyIds: input.studyIds,
    createdAt: new Date()
  };

  samples.push(sample);
  return sample;
};

/**
 * Changes a sample's code, date, values, studies, implementation, observation
 * and note. Its lineage is untouched.
 *
 * @param experimentId - Owning experiment's id.
 * @param id - The sample to change.
 * @param input - Validated, converted sample.
 * @returns The updated sample, or undefined when the experiment has none with that id.
 */
export const updateSample = async (
  experimentId: string,
  id: string,
  input: SampleInput
): Promise<Sample | undefined> => {
  const index = samples.findIndex(
    sample => sample.id === id && sample.experimentId === experimentId
  );
  const existing = samples[index];
  if (!existing) return undefined;

  const updated: Sample = {
    ...existing,
    code: input.code,
    performedOn: input.performedOn,
    values: input.values,
    studyIds: input.studyIds,
    implementation: input.implementation,
    observation: input.observation,
    note: input.note
  };
  samples[index] = updated;
  return updated;
};

/**
 * Tags samples of one experiment with a study. Samples that already have it
 * keep it once, and ids that are not in the experiment are skipped.
 *
 * @param experimentId - The experiment owning both the samples and the study.
 * @param studyId - The study to add.
 * @param sampleIds - The samples to tag.
 * @returns How many samples were tagged (not counting ones that already had it).
 */
export const assignSamplesToStudy = async (
  experimentId: string,
  studyId: string,
  sampleIds: string[]
): Promise<number> => {
  let tagged = 0;

  for (const [index, sample] of samples.entries()) {
    const isTarget =
      sample.experimentId === experimentId && sampleIds.includes(sample.id);
    if (!isTarget || sample.studyIds.includes(studyId)) continue;

    samples[index] = {
      ...sample,
      studyIds: [...sample.studyIds, studyId]
    };
    tagged += 1;
  }

  return tagged;
};
