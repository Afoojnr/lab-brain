'use server';

import { revalidatePath } from 'next/cache';

import {
  getExperimentInProject,
  listExperimentsByProject,
  updateExperiment
} from '../data/experiments';
import { buildExperimentFormSchema } from '../schemas/schemas';

/**
 * Changes an experiment from the Edit experiment form. The schema is rebuilt
 * from the project's stored experiments, so a prefix is never shared (its own
 * prefix does not count as a duplicate). Invalid input is ignored.
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
