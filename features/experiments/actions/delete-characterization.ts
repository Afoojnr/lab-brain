'use server';

import { revalidatePath } from 'next/cache';

import { getStorage } from '@/lib/storage';

import {
  deleteCharacterization,
  getCharacterizationOfSample
} from '../data/characterizations';
import {
  deleteDataset,
  listDatasetsByCharacterization
} from '../data/datasets';
import { getExperimentInProject } from '../data/experiments';
import { getSampleById } from '../data/samples';

/**
 * Removes a characterization and the files attached to it, then refreshes the sample and experiment pages.
 */
export const deleteCharacterizationAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  characterizationId: string
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;
  if ((await getSampleById(sampleId))?.experimentId !== experimentId) {
    return false;
  }

  if (!(await getCharacterizationOfSample(sampleId, characterizationId))) {
    return false;
  }

  // Its files go with it: the file in storage first, then the record (which
  // also removes the file records).
  for (const dataset of await listDatasetsByCharacterization(
    characterizationId
  )) {
    await getStorage().delete(dataset.storagePath);
    await deleteDataset(dataset.id);
  }
  const wasDeleted = await deleteCharacterization(sampleId, characterizationId);
  if (!wasDeleted) return false;

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}`
  );

  return true;
};
