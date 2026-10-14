import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { analyses } from '@/lib/db/schema';

import type { Analysis, AnalysisKind, AnalysisSettings } from '../types';

type AnalysisRow = typeof analyses.$inferSelect;

// The settings column holds JSON that only this module writes, always as
// `AnalysisSettings` (validated by the action before it gets here).
const toAnalysis = (row: AnalysisRow): Analysis => ({
  ...row,
  kind: row.kind as AnalysisKind,
  settings: row.settings as AnalysisSettings
});

/**
 * The saved settings of a characterization's analysis, if any.
 *
 * @param characterizationId - Owning characterization's id.
 * @param kind - Which analysis.
 */
export const getAnalysis = async (
  characterizationId: string,
  kind: AnalysisKind
): Promise<Analysis | undefined> => {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(analyses)
    .where(
      and(
        eq(analyses.characterizationId, characterizationId),
        eq(analyses.kind, kind)
      )
    );

  return row ? toAnalysis(row) : undefined;
};

/**
 * Saves the settings of an analysis, replacing the earlier ones: one analysis
 * per characterization and kind.
 *
 * @param characterizationId - Owning characterization's id.
 * @param kind - Which analysis.
 * @param settings - Validated settings.
 */
export const saveAnalysis = async (
  characterizationId: string,
  kind: AnalysisKind,
  settings: AnalysisSettings
): Promise<Analysis> => {
  const db = await getDb();
  const updatedAt = new Date();
  const [row] = await db
    .insert(analyses)
    .values({
      id: crypto.randomUUID(),
      characterizationId,
      kind,
      settings,
      updatedAt
    })
    .onConflictDoUpdate({
      target: [analyses.characterizationId, analyses.kind],
      set: { settings, updatedAt }
    })
    .returning();

  return toAnalysis(row as AnalysisRow);
};

/**
 * The most recently saved target of each value for an analysis kind anywhere
 * in a set of characterizations, so a new characterization starts with the
 * columns the last one used.
 *
 * @param characterizationIds - The characterizations to look through.
 * @param kind - Which analysis.
 */
export const latestTargets = async (
  characterizationIds: string[],
  kind: AnalysisKind
): Promise<AnalysisSettings['targets']> => {
  if (characterizationIds.length === 0) return {};

  const db = await getDb();
  const [latest] = await db
    .select()
    .from(analyses)
    .where(
      and(
        eq(analyses.kind, kind),
        inArray(analyses.characterizationId, characterizationIds)
      )
    )
    .orderBy(desc(analyses.updatedAt))
    .limit(1);

  return latest ? toAnalysis(latest).settings.targets : {};
};

/**
 * Removes the saved analyses of characterizations that were deleted.
 *
 * @param characterizationIds - The characterizations that are gone.
 * @returns How many saved analyses were removed.
 */
export const deleteAnalysesOf = async (
  characterizationIds: string[]
): Promise<number> => {
  if (characterizationIds.length === 0) return 0;

  const db = await getDb();
  const removed = await db
    .delete(analyses)
    .where(inArray(analyses.characterizationId, characterizationIds))
    .returning({ id: analyses.id });

  return removed.length;
};
