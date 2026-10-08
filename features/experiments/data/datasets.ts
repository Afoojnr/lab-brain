import type { Dataset } from '../types';
import { listCharacterizationsBySample } from './characterizations';
import { DEMO_DATASETS } from './demo-datasets';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts. Unlike the
// other lists it sits on `globalThis`: the file route (a Route Handler) is
// bundled apart from the pages and actions, so a plain module-level list would
// be a separate copy there and a just-attached file would 404. A database has
// no such problem.
const store = globalThis as { __labBrainDatasets?: Dataset[] };
const datasets: Dataset[] = (store.__labBrainDatasets ??= [...DEMO_DATASETS]);

/**
 * A characterization's files, oldest first.
 *
 * @param characterizationId - Owning characterization's id.
 */
export const listDatasetsByCharacterization = async (
  characterizationId: string
): Promise<Dataset[]> =>
  datasets
    .filter(item => item.characterizationId === characterizationId)
    .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());

/**
 * Every file attached to any of a sample's characterizations.
 *
 * @param sampleId - Owning sample's id.
 */
export const listDatasetsBySample = async (
  sampleId: string
): Promise<Dataset[]> => {
  const ids = new Set(
    (await listCharacterizationsBySample(sampleId)).map(item => item.id)
  );

  return datasets
    .filter(item => ids.has(item.characterizationId))
    .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
};

/**
 * One file record by id.
 *
 * @param id - Dataset id.
 */
export const getDatasetById = async (
  id: string
): Promise<Dataset | undefined> => datasets.find(item => item.id === id);

/**
 * Records a file already written to storage.
 *
 * @param characterizationId - Owning characterization's id.
 * @param file - Where it was stored, and what it is.
 * @returns The stored record.
 */
export const createDataset = async (
  characterizationId: string,
  file: Pick<
    Dataset,
    | 'fileName'
    | 'folder'
    | 'relativePath'
    | 'storagePath'
    | 'contentType'
    | 'sizeBytes'
  >
): Promise<Dataset> => {
  const dataset: Dataset = {
    id: crypto.randomUUID(),
    characterizationId,
    ...file,
    uploadedAt: new Date()
  };

  datasets.push(dataset);
  return dataset;
};

/**
 * Removes a file record (the caller removes the file from storage).
 *
 * @param id - The record to remove.
 * @returns Whether a record was removed.
 */
export const deleteDataset = async (id: string): Promise<boolean> => {
  const index = datasets.findIndex(item => item.id === id);
  if (index === -1) return false;

  datasets.splice(index, 1);
  return true;
};
