'use server';

import { revalidatePath } from 'next/cache';

import {
  createParameterDefinition,
  listParameterDefinitions
} from '../data/parameter-definitions';
import { getExperimentInProject } from '../data/experiments';
import { buildParameterFormSchema, toParameterInput } from '../schemas';

/**
 * Adds a parameter (a column) to an experiment from the Add parameter form, then
 * refreshes the experiment page. The schema is rebuilt here from the
 * experiment's stored parameters; invalid input only comes from a direct call,
 * so it is ignored.
 *
 * @param projectId - Owning project's id.
 * @param experimentId - The experiment gaining the parameter.
 * @param input - Raw form values.
 * @returns Whether a parameter was added.
 */
export const createParameterDefinitionAction = async (
  projectId: string,
  experimentId: string,
  input: unknown
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;

  const existing = await listParameterDefinitions(experimentId);
  const parsed = buildParameterFormSchema(
    existing.map(definition => definition.name)
  ).safeParse(input);
  if (!parsed.success) return false;

  await createParameterDefinition(experimentId, toParameterInput(parsed.data));
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
