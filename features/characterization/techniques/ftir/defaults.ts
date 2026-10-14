import type { FtirSettings } from './types';

/** Settings before the user changes anything. */
export const defaultFtirSettings = (): FtirSettings => ({
  reading: null,
  convertToAbsorbance: false,
  normalisation: { method: 'none', range: null, referencePosition: null },
  detection: { range: null, sensitivity: 0.01, minSpacing: 10 },
  tolerance: 10,
  offset: 0.2,
  peaks: []
});
