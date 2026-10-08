import { DEFAULT_EDX_VALUE_IDS } from './techniques/edx/stats';
import { DEFAULT_ELLIPSOMETRY_VALUE_IDS } from './techniques/ellipsometry/parse';
import type { AnalysisKind, AnalysisSettings } from './types';

/** The analysis to offer for a technique name, or null when the name says nothing. The user can always choose. */
export const suggestKind = (technique: string): AnalysisKind | null => {
  const name = technique.trim().toLowerCase();
  if (name.includes('edx') || name.includes('eds')) return 'edx';
  if (name.includes('ellips')) return 'ellipsometry';

  return null;
};

/** Settings before the user changes anything: B over N, no spot left out, the usual values ticked. */
export const defaultSettings = (kind: AnalysisKind): AnalysisSettings => ({
  numerator: 'B',
  denominator: 'N',
  excludedSpots: [],
  datasetId: null,
  selectedValueIds:
    kind === 'edx' ? DEFAULT_EDX_VALUE_IDS : DEFAULT_ELLIPSOMETRY_VALUE_IDS,
  targets: {}
});
