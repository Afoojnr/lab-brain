import type { Spot } from './techniques/edx/types';
import type { SeqfitSummary } from './techniques/ellipsometry/parse';

/**
 * One characterization of an experiment's sample, as the workspace lists it
 * for a batch: what its files say, and the values the sample holds now.
 */
export type BatchRow = {
  characterizationId: string;
  sampleId: string;
  sampleCode: string;
  measuredOn: string | null;
  technique: string;
  /** The sample's stored values by column id, to show what an update replaces. */
  currentValues: Record<string, number | string>;
  /** EDX: the spots (without spectra, to keep the page light) and the ones left out last time. */
  edx: {
    spots: Spot[];
    problems: { file: string; reason: string }[];
    excludedSpots: string[];
  } | null;
  /** Ellipsometry: what the first readable fit export says, or why none could be read. */
  ellipsometry: { summary: SeqfitSummary | null; reason: string | null } | null;
};
