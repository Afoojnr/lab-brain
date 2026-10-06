import type { Characterization } from './types';

/**
 * Spells a typed technique the way the project already writes it, ignoring
 * case, so "eds" becomes the existing "EDS" instead of a near-duplicate that
 * would split one technique into two.
 *
 * @param name - The technique as typed.
 * @param knownTechniques - Techniques already used in the project.
 * @returns The matching known spelling, or the trimmed name when it is new.
 */
export const matchTechnique = (
  name: string,
  knownTechniques: string[]
): string => {
  const trimmed = name.trim();

  return (
    knownTechniques.find(
      known => known.toLowerCase() === trimmed.toLowerCase()
    ) ?? trimmed
  );
};

export type TechniqueSummary = {
  technique: string;
  count: number;
  /** Dates it was done, oldest first; unrecorded dates are left out. */
  dates: string[];
};

/**
 * One entry per technique done on a sample, in the order first recorded, with
 * how many times and on which dates. The same technique done twice stays one
 * entry, so a table cell shows "SEM x2", not two badges.
 *
 * @param characterizations - The sample's characterizations.
 */
export const summarizeTechniques = (
  characterizations: Pick<Characterization, 'technique' | 'measuredOn'>[]
): TechniqueSummary[] => {
  const summaries = new Map<string, TechniqueSummary>();

  for (const { technique, measuredOn } of characterizations) {
    const summary = summaries.get(technique) ?? {
      technique,
      count: 0,
      dates: []
    };
    summary.count += 1;
    if (measuredOn) summary.dates.push(measuredOn);
    summaries.set(technique, summary);
  }

  return [...summaries.values()].map(summary => ({
    ...summary,
    dates: [...summary.dates].sort()
  }));
};
