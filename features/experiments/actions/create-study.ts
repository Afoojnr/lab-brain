'use server';

import { revalidatePath } from 'next/cache';

import { createStudy, listStudiesByExperiment } from '../data/studies';
import { getExperimentInProject } from '../data/experiments';
import { buildStudyFormSchema } from '../schemas';

/**
 * Adds a study to an experiment from the New study form, then refreshes
 * the experiment page. The schema is rebuilt here from the experiment's stored
 * studies, so a name can never be reused; invalid input only comes from a
 * direct call, so it is ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment gaining the study.
 * @param input - Raw form values.
 * @returns The new study's id, or null when ignored.
 */
export const createStudyAction = async (
  projectId: string,
  experimentId: string,
  input: unknown
): Promise<string | null> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return null;

  const existing = await listStudiesByExperiment(experimentId);
  const parsed = buildStudyFormSchema(
    existing.map(study => study.name)
  ).safeParse(input);
  if (!parsed.success) return null;

  const study = await createStudy(experimentId, parsed.data);
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return study.id;
};
