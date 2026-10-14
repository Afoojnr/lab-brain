'use server';

import { revalidatePath } from 'next/cache';

import { removeStudy } from '../cascade/remove-records';
import { getExperimentInProject } from '../data/experiments';

/** Deletes a study. */
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
