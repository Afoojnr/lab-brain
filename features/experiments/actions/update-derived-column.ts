'use server';

import { revalidatePath } from 'next/cache';

import {
  listDerivedColumns,
  updateDerivedColumn
} from '../data/derived-columns';
import { getExperimentInProject } from '../data/experiments';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { dependentsOf, formulaColumns } from '../calculations/derived-values';
import {
  buildDerivedColumnFormSchema,
  toDerivedColumnInput
} from '../schemas/schemas';

/**
 * Changes a calculated column from the Edit form, then refreshes the experiment
 * page. Invalid input only comes from a direct call, so it is ignored.
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
  // A formula may use the entered columns and the calculated columns that do
  // not use this one (nor this one), or it would loop back to itself.
  const usable = formulaColumns(columns, derived, columnId);
  const blockedNames = [
    derived.find(column => column.id === columnId)?.name ?? '',
    ...dependentsOf(derived, columnId).map(column => column.name)
  ];
  const parsed = buildDerivedColumnFormSchema(
    usable,
    otherNames,
    blockedNames
  ).safeParse(input);
  if (!parsed.success) return false;

  await updateDerivedColumn(
    experimentId,
    columnId,
    toDerivedColumnInput(usable, parsed.data)
  );
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
