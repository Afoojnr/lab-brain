'use server';

import { revalidatePath } from 'next/cache';

import {
  listDerivedColumns,
  updateDerivedColumn
} from '../data/derived-columns';
import { getExperimentInProject } from '../data/experiments';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { buildDerivedColumnFormSchema, toDerivedColumnInput } from '../schemas';

/**
 * Changes a calculated column from the Edit form, then refreshes the
 * experiment page. The schema is rebuilt from the stored columns; the column's
 * own name does not count as a duplicate. Invalid input only comes from a
 * direct call, so it is ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the column belongs to.
 * @param columnId - The calculated column to change.
 * @param input - Raw form values.
 * @returns Whether it was changed.
 */
export const updateDerivedColumnAction = async (
  projectId: string,
  experimentId: string,
  columnId: string,
  input: unknown
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;

  const [columns, derived] = await Promise.all([
    listParameterDefinitions(experimentId),
    listDerivedColumns(experimentId)
  ]);
  if (!derived.some(column => column.id === columnId)) return false;

  const otherNames = [
    ...columns,
    ...derived.filter(column => column.id !== columnId)
  ].map(column => column.name);
  const parsed = buildDerivedColumnFormSchema(columns, otherNames).safeParse(
    input
  );
  if (!parsed.success) return false;

  await updateDerivedColumn(
    experimentId,
    columnId,
    toDerivedColumnInput(columns, parsed.data)
  );
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
