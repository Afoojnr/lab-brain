'use server';

import { revalidatePath } from 'next/cache';

import { removeStudy } from '../cascade/remove-records';
import { getExperimentInProject } from '../data/experiments';

/**
 * Deletes a study. Its samples stay with all their data and only lose the tag.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the study.
 * @param studyId - The study to delete.
 * @returns How many samples had the tag, or null when ignored or not found.
 */
export const deleteStudyAction = async (
  projectId: string,
  experimentId: string,
  studyId: string
): Promise<number | null> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return null;

  const count = await removeStudy(experimentId, studyId);
  if (count === null) return null;

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return count;
};
