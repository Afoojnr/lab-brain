'use server';

import { revalidatePath } from 'next/cache';

import { getExperimentInProject } from '../data/experiments';
import {
  getStudyInExperiment,
  listStudiesByExperiment,
  updateStudy
} from '../data/studies';
import { buildStudyFormSchema } from '../schemas/schemas';

/**
 * Changes a study from the Edit study form. The schema is rebuilt from the
 * experiment's stored studies, so a name is never shared (its own name does not
 * count as a duplicate). Invalid input is ignored.
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
