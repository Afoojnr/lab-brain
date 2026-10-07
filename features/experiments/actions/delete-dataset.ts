'use server';

import { revalidatePath } from 'next/cache';

import { getStorage } from '@/lib/storage';

import { getCharacterizationOfSample } from '../data/characterizations';
import { deleteDataset, getDatasetById } from '../data/datasets';
import { getExperimentInProject } from '../data/experiments';
import { getSampleById } from '../data/samples';

/**
 * Removes one attached file, from storage and from the records, after checking
 * that it belongs to the characterization, sample, experiment and project the
 * caller names.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample the characterization belongs to.
 * @param characterizationId - The characterization the file is attached to.
 * @param datasetId - The file to remove.
 * @returns Whether a file was removed.
 */
export const deleteDatasetAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  characterizationId: string,
  datasetId: string
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;
  if ((await getSampleById(sampleId))?.experimentId !== experimentId) {
    return false;
  }
  if (!(await getCharacterizationOfSample(sampleId, characterizationId))) {
    return false;
  }

  const dataset = await getDatasetById(datasetId);
  if (dataset?.characterizationId !== characterizationId) return false;

  await getStorage().delete(dataset.storagePath);
  await deleteDataset(dataset.id);
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}`
  );

  return true;
};
