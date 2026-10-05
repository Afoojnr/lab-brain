'use server';

import { revalidatePath } from 'next/cache';

import {
  getExperimentInProject,
  listExperimentsByProject,
  updateExperiment
} from '../data/experiments';
import { buildExperimentFormSchema } from '../schemas';

/**
 * Changes an experiment from the Edit experiment form, then refreshes the pages that
 * show it. The schema is rebuilt here from the project's other stored experiment,
 * so a prefix still can never be shared; the experiment's own prefix does not count
 * as a duplicate. Invalid input only comes from a direct call, so it is
 * ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment to change.
 * @param input - Raw form values.
 * @returns True when the experiment was changed, false when ignored.
 */
export const updateExperimentAction = async (
  projectId: string,
  experimentId: string,
  input: unknown
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;

  const siblings = await listExperimentsByProject(projectId);
  const parsed = buildExperimentFormSchema(
    siblings
      .filter(experiment => experiment.id !== experimentId)
      .map(experiment => experiment.codePrefix)
  ).safeParse(input);
  if (!parsed.success) return false;

  const experiment = await updateExperiment(experimentId, parsed.data);
  if (!experiment) return false;

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
