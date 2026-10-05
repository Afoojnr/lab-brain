'use server';

import { revalidatePath } from 'next/cache';

import { getExperimentInProject } from '../data/experiments';
import {
  getStudyInExperiment,
  listStudiesByExperiment,
  updateStudy
} from '../data/studies';
import { buildStudyFormSchema } from '../schemas';

/**
 * Changes a study from the Edit study form, then refreshes the experiment
 * page. The schema is rebuilt here from the experiment's other stored
 * studies, so a name still can never be shared; the study's own name does not
 * count as a duplicate. Invalid input only comes from a direct call, so it is
 * ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment owning the study.
 * @param studyId - The study to change.
 * @param input - Raw form values.
 * @returns True when the study was changed, false when ignored or not found.
 */
export const updateStudyAction = async (
  projectId: string,
  experimentId: string,
  studyId: string,
  input: unknown
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;
  if (!(await getStudyInExperiment(experimentId, studyId))) return false;

  const siblings = await listStudiesByExperiment(experimentId);
  const parsed = buildStudyFormSchema(
    siblings.filter(study => study.id !== studyId).map(study => study.name)
  ).safeParse(input);
  if (!parsed.success) return false;

  const study = await updateStudy(experimentId, studyId, parsed.data);
  if (!study) return false;

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
