import type { SpectrumPoint, SpectrumReading } from './types';

export type ReadingGuess = {
  reading: SpectrumReading;
  /** Why: the values look like a percentage, like absorbance, or cannot tell. */
  reason: 'percentTransmittance' | 'absorbanceRange' | 'ambiguous' | 'unclear';
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

/**
 * What a spectrum's values most likely are, from the numbers alone (the file
 * does not say). The user can always overrule it. - Between 0 and about 110
 * with a typical value above 5: percent transmittance (absorbance is normally
 * under about 3). - A maximum of 5 or less: absorbance.
 */
export const guessReading = (points: SpectrumPoint[]): ReadingGuess => {
  const values = points.map(point => point.y);
  const max = Math.max(...values);
  const min = Math.min(...values);

  if (max <= 1.2 && min >= 0) {
    return { reading: 'absorbance', reason: 'ambiguous' };
  }
  if (max <= 5) return { reading: 'absorbance', reason: 'absorbanceRange' };
  if (max <= 110 && min >= 0 && median(values) > 5) {
    return { reading: 'transmittance', reason: 'percentTransmittance' };
  }

  return { reading: 'absorbance', reason: 'unclear' };
};
