'use server';

import { revalidatePath } from 'next/cache';

import { deleteCharacterization } from '../data/characterizations';
import { getExperimentInProject } from '../data/experiments';
import { getSampleById } from '../data/samples';

/**
 * Removes a characterization, then refreshes the sample and experiment pages.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample the record belongs to.
 * @param characterizationId - The record to remove.
 * @returns Whether a record was removed.
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

  const wasDeleted = await deleteCharacterization(sampleId, characterizationId);
  if (!wasDeleted) return false;

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}`
  );

  return true;
};
