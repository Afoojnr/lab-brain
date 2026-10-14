'use server';

import { revalidatePath } from 'next/cache';

import {
  createDerivedColumn,
  listDerivedColumns
} from '../data/derived-columns';
import { getExperimentInProject } from '../data/experiments';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { formulaColumns } from '../calculations/derived-values';
import {
  buildDerivedColumnFormSchema,
  toDerivedColumnInput
} from '../schemas/schemas';

/**
 * Adds a calculated column. The schema is rebuilt from the stored columns, so a
 * formula that names a missing or text column is refused. Invalid input is
 * ignored.
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
  // A formula may use the entered columns and any calculated column that exists.
  const usable = formulaColumns(columns, derived);
  const parsed = buildDerivedColumnFormSchema(usable, names).safeParse(input);
  if (!parsed.success) return false;

  await createDerivedColumn(
    experimentId,
    toDerivedColumnInput(usable, parsed.data)
  );
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
