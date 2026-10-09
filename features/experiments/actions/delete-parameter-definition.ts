'use server';

import { revalidatePath } from 'next/cache';

import { listDerivedColumnsUsing } from '../data/derived-columns';
import { deleteParameterDefinition } from '../data/parameter-definitions';
import { isParameterInUse } from '../data/samples';
import { getExperimentInProject } from '../data/experiments';

/**
 * Removes a parameter, then refreshes the experiment page. A parameter that
 * any sample holds a value for is kept, so recorded values never lose their
 * meaning.
 *
 * @param projectId - Owning project's id.
 * @param experimentId - The experiment that owns the parameter.
 * @param definitionId - The parameter to remove.
 * @returns Whether the parameter was removed.
 */
export const deleteParameterDefinitionAction = async (
  projectId: string,
  experimentId: string,
  definitionId: string
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;
  if (await isParameterInUse(definitionId)) return false;
  // A calculated column's formula uses it: delete that column or change its formula first.
  if ((await listDerivedColumnsUsing(experimentId, definitionId)).length > 0) {
    return false;
  }

  const wasDeleted = await deleteParameterDefinition(
    experimentId,
    definitionId
  );
  if (!wasDeleted) return false;

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
