'use server';

import { revalidatePath } from 'next/cache';

import { getStorage } from '@/lib/storage';

import { getCharacterizationOfSample } from '../data/characterizations';
import {
  deleteDataset,
  listDatasetsByCharacterization
} from '../data/datasets';
import { getExperimentInProject } from '../data/experiments';
import { getSampleById } from '../data/samples';

/**
 * Removes every file of one uploaded folder, from storage and from the
 * records, after checking that the characterization belongs to the sample,
 * experiment and project the caller names. Only that folder's files go: loose
 * files and other folders stay.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample the characterization belongs to.
 * @param characterizationId - The characterization the folder is attached to.
 * @param folder - The folder's name, as the files carry it.
 * @returns How many files were removed, or null when nothing matched.
 */
export const deleteDatasetFolderAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  characterizationId: string,
  folder: string
): Promise<number | null> => {
  if (folder === '') return null;
  if (!(await getExperimentInProject(projectId, experimentId))) return null;
  if ((await getSampleById(sampleId))?.experimentId !== experimentId) {
    return null;
  }
  if (!(await getCharacterizationOfSample(sampleId, characterizationId))) {
    return null;
  }

  const files = (
    await listDatasetsByCharacterization(characterizationId)
  ).filter(dataset => dataset.folder === folder);
  if (files.length === 0) return null;

  for (const dataset of files) {
    await getStorage().delete(dataset.storagePath);
    await deleteDataset(dataset.id);
  }

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}`
  );
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}/characterizations/${characterizationId}`
  );

  return files.length;
};
