import type { Analysis, AnalysisKind, AnalysisSettings } from '../types';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
const analyses: Analysis[] = [];

/**
 * The saved settings of a characterization's analysis, if any.
 *
 * @param characterizationId - Owning characterization's id.
 * @param kind - Which analysis.
 */
export const getAnalysis = async (
  characterizationId: string,
  kind: AnalysisKind
): Promise<Analysis | undefined> =>
  analyses.find(
    item => item.characterizationId === characterizationId && item.kind === kind
  );

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
  const existing = await getAnalysis(characterizationId, kind);
  if (existing) {
    existing.settings = settings;
    existing.updatedAt = new Date();
    return existing;
  }

  const analysis: Analysis = {
    id: crypto.randomUUID(),
    characterizationId,
    kind,
    settings,
    updatedAt: new Date()
  };
  analyses.push(analysis);
  return analysis;
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
  const latest = analyses
    .filter(
      item =>
        item.kind === kind &&
        characterizationIds.includes(item.characterizationId)
    )
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

  return latest?.settings.targets ?? {};
};
