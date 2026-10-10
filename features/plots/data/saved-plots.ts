import type { SavedPlot, SavedPlotInput } from '../types';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so saved plots reset when the dev server restarts.
const savedPlots: SavedPlot[] = [];

/**
 * An experiment's saved plots, oldest first.
 *
 * @param experimentId - Owning experiment's id.
 */
export const listSavedPlots = async (
  experimentId: string
): Promise<SavedPlot[]> =>
  savedPlots
    .filter(plot => plot.experimentId === experimentId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

/**
 * One saved plot, only when it belongs to the experiment.
 *
 * @param experimentId - The experiment the caller says owns it.
 * @param plotId - The saved plot's id.
 */
export const getSavedPlot = async (
  experimentId: string,
  plotId: string
): Promise<SavedPlot | undefined> =>
  savedPlots.find(
    plot => plot.id === plotId && plot.experimentId === experimentId
  );

/**
 * Stores a new saved plot. Input must already be validated by
 * `buildSavedPlotSchema`.
 */
export const createSavedPlot = async (
  experimentId: string,
  input: SavedPlotInput
): Promise<SavedPlot> => {
  const plot: SavedPlot = {
    id: crypto.randomUUID(),
    experimentId,
    ...input,
    createdAt: new Date()
  };
  savedPlots.push(plot);

  return plot;
};

/** Replaces a saved plot's title and what it plots; null when it is not the experiment's. */
export const updateSavedPlot = async (
  experimentId: string,
  plotId: string,
  input: SavedPlotInput
): Promise<SavedPlot | null> => {
  const plot = await getSavedPlot(experimentId, plotId);
  if (!plot) return null;

  Object.assign(plot, input);

  return plot;
};

/** Removes a saved plot; false when it is not the experiment's. */
export const deleteSavedPlot = async (
  experimentId: string,
  plotId: string
): Promise<boolean> => {
  const index = savedPlots.findIndex(
    plot => plot.id === plotId && plot.experimentId === experimentId
  );
  if (index === -1) return false;

  savedPlots.splice(index, 1);

  return true;
};
