import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { savedPlots } from '@/lib/db/schema';

import type { SavedPlot, SavedPlotInput } from '../types';

type SavedPlotRow = typeof savedPlots.$inferSelect;

// The JSON columns are only ever written by this module, from a validated
// `SavedPlotInput`, so reading them back is a plain cast.
const toSavedPlot = (row: SavedPlotRow): SavedPlot => ({
  ...row,
  settings: row.settings as SavedPlot['settings'],
  filters: row.filters as SavedPlot['filters'],
  untickedIds: row.untickedIds as SavedPlot['untickedIds'],
  style: row.style as SavedPlot['style']
});

/** An experiment's saved plots, oldest first. */
export const listSavedPlots = async (
  experimentId: string
): Promise<SavedPlot[]> => {
  const db = await getDb();
  const rows = await db
    .select()
    .from(savedPlots)
    .where(eq(savedPlots.experimentId, experimentId))
    .orderBy(savedPlots.createdAt, sql`rowid`);

  return rows.map(toSavedPlot);
};

/** One saved plot, only when it belongs to the given experiment. */
export const getSavedPlot = async (
  experimentId: string,
  plotId: string
): Promise<SavedPlot | undefined> => {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(savedPlots)
    .where(
      and(eq(savedPlots.id, plotId), eq(savedPlots.experimentId, experimentId))
    );

  return row ? toSavedPlot(row) : undefined;
};

/** Stores a new saved plot. Input must already be validated. */
export const createSavedPlot = async (
  experimentId: string,
  input: SavedPlotInput
): Promise<SavedPlot> => {
  const db = await getDb();
  const plot: SavedPlot = {
    id: crypto.randomUUID(),
    experimentId,
    ...input,
    createdAt: new Date()
  };
  await db.insert(savedPlots).values(plot);

  return plot;
};

/** Replaces what a saved plot holds. */
export const updateSavedPlot = async (
  experimentId: string,
  plotId: string,
  input: SavedPlotInput
): Promise<SavedPlot | null> => {
  const db = await getDb();
  const [row] = await db
    .update(savedPlots)
    .set(input)
    .where(
      and(eq(savedPlots.id, plotId), eq(savedPlots.experimentId, experimentId))
    )
    .returning();

  return row ? toSavedPlot(row) : null;
};

/** Removes a saved plot. */
export const deleteSavedPlot = async (
  experimentId: string,
  plotId: string
): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(savedPlots)
    .where(
      and(eq(savedPlots.id, plotId), eq(savedPlots.experimentId, experimentId))
    )
    .returning({ id: savedPlots.id });

  return removed.length > 0;
};

/** Removes every saved plot of an experiment that was deleted. */
export const deleteSavedPlotsOf = async (
  experimentId: string
): Promise<number> => {
  const db = await getDb();
  const removed = await db
    .delete(savedPlots)
    .where(eq(savedPlots.experimentId, experimentId))
    .returning({ id: savedPlots.id });

  return removed.length;
};
