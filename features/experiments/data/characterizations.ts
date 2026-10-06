import type { CharacterizationFormValues } from '../schemas';
import type { Characterization } from '../types';
import { DEMO_CHARACTERIZATIONS } from './demo-characterizations';
import { listExperimentsByProject } from './experiments';
import { listSamplesByExperiment } from './samples';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
const characterizations: Characterization[] = [...DEMO_CHARACTERIZATIONS];

const byDateThenCreation = (a: Characterization, b: Characterization) => {
  if (a.measuredOn !== b.measuredOn) {
    if (a.measuredOn === null) return 1;
    if (b.measuredOn === null) return -1;
    return a.measuredOn < b.measuredOn ? -1 : 1;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
};

/**
 * A sample's characterizations, oldest date first; ones without a date last.
 *
 * @param sampleId - Owning sample's id.
 */
export const listCharacterizationsBySample = async (
  sampleId: string
): Promise<Characterization[]> =>
  characterizations
    .filter(item => item.sampleId === sampleId)
    .sort(byDateThenCreation);

/**
 * Every characterization of an experiment's samples, for its samples table.
 *
 * @param experimentId - Owning experiment's id.
 */
export const listCharacterizationsByExperiment = async (
  experimentId: string
): Promise<Characterization[]> => {
  const sampleIds = new Set(
    (await listSamplesByExperiment(experimentId)).map(sample => sample.id)
  );

  return characterizations
    .filter(item => sampleIds.has(item.sampleId))
    .sort(byDateThenCreation);
};

/**
 * The techniques already used anywhere in a project, spelled as first typed,
 * so a new record can reuse them instead of creating near-duplicates.
 *
 * @param projectId - Owning project's id.
 */
export const listTechniquesByProject = async (
  projectId: string
): Promise<string[]> => {
  const techniques: string[] = [];

  for (const experiment of await listExperimentsByProject(projectId)) {
    for (const item of await listCharacterizationsByExperiment(experiment.id)) {
      if (!techniques.includes(item.technique)) techniques.push(item.technique);
    }
  }

  return techniques;
};

/**
 * One characterization, but only when it belongs to the given sample, so a
 * record can never be reached through another sample's page.
 *
 * @param sampleId - The sample the caller says owns the record.
 * @param id - Characterization id.
 */
export const getCharacterizationOfSample = async (
  sampleId: string,
  id: string
): Promise<Characterization | undefined> =>
  characterizations.find(item => item.id === id && item.sampleId === sampleId);

/**
 * Stores a new characterization. Input must already be validated by
 * `characterizationFormSchema`, with the technique spelled by `matchTechnique`.
 *
 * @param sampleId - Owning sample's id.
 * @param values - Validated technique, date and note.
 * @returns The stored characterization.
 */
export const createCharacterization = async (
  sampleId: string,
  values: CharacterizationFormValues
): Promise<Characterization> => {
  const item: Characterization = {
    id: crypto.randomUUID(),
    sampleId,
    technique: values.technique,
    measuredOn: values.measuredOn === '' ? null : values.measuredOn,
    note: values.note === '' ? null : values.note,
    createdAt: new Date()
  };

  characterizations.push(item);
  return item;
};

/**
 * Changes a characterization's technique, date and note.
 *
 * @param sampleId - The sample owning the record.
 * @param id - The record to change.
 * @param values - Validated technique, date and note.
 * @returns The updated record, or undefined when the sample has none with that id.
 */
export const updateCharacterization = async (
  sampleId: string,
  id: string,
  values: CharacterizationFormValues
): Promise<Characterization | undefined> => {
  const index = characterizations.findIndex(
    item => item.id === id && item.sampleId === sampleId
  );
  const existing = characterizations[index];
  if (!existing) return undefined;

  const updated: Characterization = {
    ...existing,
    technique: values.technique,
    measuredOn: values.measuredOn === '' ? null : values.measuredOn,
    note: values.note === '' ? null : values.note
  };
  characterizations[index] = updated;
  return updated;
};

/**
 * Removes a characterization.
 *
 * @param sampleId - The sample owning the record.
 * @param id - The record to remove.
 * @returns Whether a record was removed.
 */
export const deleteCharacterization = async (
  sampleId: string,
  id: string
): Promise<boolean> => {
  const index = characterizations.findIndex(
    item => item.id === id && item.sampleId === sampleId
  );
  if (index === -1) return false;

  characterizations.splice(index, 1);
  return true;
};
