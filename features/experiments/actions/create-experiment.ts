'use server';

import { revalidatePath } from 'next/cache';

import { getProjectById } from '../data/projects';
import {
  createExperiment,
  listExperimentsByProject
} from '../data/experiments';
import { buildExperimentFormSchema } from '../schemas';

/**
 * Adds an experiment to a project from the New experiment form, then refreshes the
 * project page. The schema is rebuilt here from the project's stored experiment,
 * so a prefix can never be reused; invalid input only comes from a direct
 * call, so it is ignored.
 *
 * @param projectId - The project gaining the experiment.
 * @param input - Raw form values.
 * @returns The new experiment's id, or null when ignored.
 */
export const createExperimentAction = async (
  projectId: string,
  input: unknown
): Promise<string | null> => {
  if (!(await getProjectById(projectId))) return null;

  const existing = await listExperimentsByProject(projectId);
  const parsed = buildExperimentFormSchema(
    existing.map(experiment => experiment.codePrefix)
  ).safeParse(input);
  if (!parsed.success) return null;

  const experiment = await createExperiment(projectId, parsed.data);
  revalidatePath(`/projects/${projectId}`);

  return experiment.id;
};
