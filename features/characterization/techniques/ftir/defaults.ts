import type { FtirSettings } from './types';

/**
 * Settings before the user changes anything. These are adjustable algorithm
 * settings (how picky the peak finder is, how close counts as the same peak),
 * not scientific constants, and the workspace shows them so they can be changed.
 */
export const defaultFtirSettings = (): FtirSettings => ({
  reading: null,
  convertToAbsorbance: false,
  normalisation: { method: 'none', range: null, referencePosition: null },
  detection: { range: null, sensitivity: 0.01, minSpacing: 10 },
  tolerance: 10,
  offset: 0.2,
  peaks: []
});
