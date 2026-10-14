'use server';

import { revalidatePath } from 'next/cache';

import { listDerivedColumnsUsing } from '../data/derived-columns';
import {
  listParameterDefinitions,
  updateParameterDefinition
} from '../data/parameter-definitions';
import { isParameterInUse } from '../data/samples';
import { getExperimentInProject } from '../data/experiments';
import { buildParameterFormSchema, toParameterInput } from '../schemas/schemas';

/**
 * Changes a parameter from the Edit parameter form, then refreshes the
 * experiment page. Invalid input only comes from a direct call, so it is
 * ignored.
 */
export const updateParameterDefinitionAction = async (
  projectId: string,
  experimentId: string,
  definitionId: string,
  input: unknown
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;

  const existing = await listParameterDefinitions(experimentId);
  const current = existing.find(definition => definition.id === definitionId);
  if (!current) return false;

  const otherNames = existing
    .filter(definition => definition.id !== definitionId)
    .map(definition => definition.name);
  const parsed = buildParameterFormSchema(otherNames).safeParse(input);
  if (!parsed.success) return false;

  if (
    parsed.data.kind !== current.kind &&
    (await isParameterInUse(definitionId))
  ) {
    return false;
  }
  // A calculated column's formula needs a number column.
  if (
    parsed.data.kind === 'text' &&
    (await listDerivedColumnsUsing(experimentId, definitionId)).length > 0
  ) {
    return false;
  }

  await updateParameterDefinition(
    experimentId,
    definitionId,
    toParameterInput(parsed.data)
  );
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
