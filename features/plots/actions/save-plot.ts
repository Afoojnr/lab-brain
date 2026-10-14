'use server';

import { revalidatePath } from 'next/cache';

import { getExperimentInProject } from '@/features/experiments/server';

import {
  createSavedPlot,
  listSavedPlots,
  updateSavedPlot
} from '../data/saved-plots';
import { loadExperimentTable } from '../compute/load-experiment';
import { buildSavedPlotSchema } from '../schemas/schemas';

/**
 * Saves the plot on screen, or replaces a saved one when `plotId` is given. The
 * schema is rebuilt from stored data, so a plot can only point at columns the
 * experiment has and a title is never reused.
 */
export const savePlotAction = async (
  projectId: string,
  experimentId: string,
  input: unknown,
  plotId?: string
): Promise<string | null> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return null;

  const [{ columns }, existing] = await Promise.all([
    loadExperimentTable(projectId, experimentId),
    listSavedPlots(experimentId)
  ]);
  const parsed = buildSavedPlotSchema(
    columns,
    existing.filter(plot => plot.id !== plotId).map(plot => plot.name)
  ).safeParse(input);
  if (!parsed.success) return null;

  const saved = plotId
    ? await updateSavedPlot(experimentId, plotId, parsed.data)
    : await createSavedPlot(experimentId, parsed.data);
  if (!saved) return null;

  revalidatePath('/plots');
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return saved.id;
};
