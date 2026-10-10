'use server';

import { revalidatePath } from 'next/cache';

import { getExperimentInProject } from '@/features/experiments/server';

import {
  createSavedPlot,
  listSavedPlots,
  updateSavedPlot
} from '../data/saved-plots';
import { loadExperimentTable } from '../load-experiment';
import { buildSavedPlotSchema } from '../schemas';

/**
 * Saves the plot on screen for an experiment, or replaces a saved plot when
 * `plotId` is given. The schema is rebuilt here from the experiment's stored
 * columns and saved plots, so a plot can only point at columns the experiment
 * has and a title can never be reused; invalid input only comes from a direct
 * call, so it is ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment being plotted.
 * @param input - The title and what to plot.
 * @param plotId - The saved plot to replace; omit to save a new one.
 * @returns The saved plot's id, or null when ignored.
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

  return saved.id;
};
