'use server';

import { revalidatePath } from 'next/cache';

import {
  createDerivedColumn,
  listDerivedColumns
} from '../data/derived-columns';
import { getExperimentInProject } from '../data/experiments';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { buildDerivedColumnFormSchema, toDerivedColumnInput } from '../schemas';

/**
 * Adds a calculated column from the Add calculated column form, then
 * refreshes the experiment page. The schema is rebuilt here from the stored
 * columns, never from anything the browser sends, so a formula that names a
 * missing or text column is refused. Invalid input only comes from a direct
 * call, so it is ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment to add the column to.
 * @param input - Raw form values.
 * @returns Whether a column was added.
 */
export const createDerivedColumnAction = async (
  projectId: string,
  experimentId: string,
  input: unknown
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;

  const [columns, derived] = await Promise.all([
    listParameterDefinitions(experimentId),
    listDerivedColumns(experimentId)
  ]);
  const names = [...columns, ...derived].map(column => column.name);
  const parsed = buildDerivedColumnFormSchema(columns, names).safeParse(input);
  if (!parsed.success) return false;

  await createDerivedColumn(
    experimentId,
    toDerivedColumnInput(columns, parsed.data)
  );
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
