'use server';

import { revalidatePath } from 'next/cache';

import { getExperimentInProject } from '@/features/experiments/server';

import { deleteSavedPlot } from '../data/saved-plots';

/**
 * Removes a saved plot. Only the plot is deleted; the experiment's samples are
 * untouched.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the plot belongs to.
 * @param plotId - The saved plot to remove.
 * @returns Whether a plot was removed.
 */
export const deleteSavedPlotAction = async (
  projectId: string,
  experimentId: string,
  plotId: string
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;

  const isDeleted = await deleteSavedPlot(experimentId, plotId);
  if (isDeleted) revalidatePath('/plots');

  return isDeleted;
};
