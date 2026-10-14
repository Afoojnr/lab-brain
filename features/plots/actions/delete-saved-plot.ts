'use server';

import { revalidatePath } from 'next/cache';

import { getExperimentInProject } from '@/features/experiments/server';

import { deleteSavedPlot } from '../data/saved-plots';

/** Removes a saved plot. */
export const deleteSavedPlotAction = async (
  projectId: string,
  experimentId: string,
  plotId: string
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;

  const isDeleted = await deleteSavedPlot(experimentId, plotId);
  if (isDeleted) {
    revalidatePath('/plots');
    revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  }

  return isDeleted;
};
