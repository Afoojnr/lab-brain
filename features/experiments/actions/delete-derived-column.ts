'use server';

import { revalidatePath } from 'next/cache';

import {
  deleteDerivedColumn,
  listDerivedColumnsUsing
} from '../data/derived-columns';
import { getExperimentInProject } from '../data/experiments';

/**
 * Removes a calculated column, then refreshes the experiment page. Nothing
 * is lost: its values were never stored, only its formula. A column that
 * another calculated column's formula uses is kept, so that formula is never
 * left pointing at nothing.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the column belongs to.
 * @param columnId - The calculated column to remove.
 * @returns Whether it was removed.
 */
export const deleteDerivedColumnAction = async (
  projectId: string,
  experimentId: string,
  columnId: string
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;

  if ((await listDerivedColumnsUsing(experimentId, columnId)).length > 0) {
    return false;
  }

  const wasDeleted = await deleteDerivedColumn(experimentId, columnId);
  if (!wasDeleted) return false;

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};
