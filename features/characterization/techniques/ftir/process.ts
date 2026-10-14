import { guessReading } from './reading';
import { normalise, toAbsorbance } from './transform';
import type {
  FtirSettings,
  PeakOrientation,
  SpectrumPoint,
  SpectrumReading
} from './types';

export type ProcessedSpectrum = {
  /** What the numbers are now (after any conversion to absorbance). */
  reading: SpectrumReading;
  /** Which way the peaks point. */
  orientation: PeakOrientation;
  points: SpectrumPoint[];
  isNormalised: boolean;
  /** Points left out because they had no absorbance (0 % or below). */
  dropped: number;
  /** Why the chosen normalisation could not be applied (the spectrum is then left as it was). */
  normaliseProblem: 'flat' | 'noReference' | 'zeroReference' | null;
};

/**
 * The spectrum as the user chose to see and measure it: what the values are
 * (their choice, else what the numbers suggest), optionally converted to
 * absorbance, then optionally normalised. The raw file is never changed. A
 * normalisation that cannot be applied leaves the spectrum as it was and says why.
 *
 * @param raw - The spectrum as read from the file.
 * @param settings - The user's choices.
 */
export const processSpectrum = (
  raw: SpectrumPoint[],
  settings: FtirSettings
): ProcessedSpectrum => {
  const read = settings.reading ?? guessReading(raw).reading;
  const isConverted = read === 'transmittance' && settings.convertToAbsorbance;
  const converted = isConverted
    ? toAbsorbance(raw)
    : { points: raw, dropped: 0 };
  const reading: SpectrumReading = isConverted ? 'absorbance' : read;
  const orientation: PeakOrientation =
    reading === 'transmittance' ? 'dip' : 'tip';

  const { method, range, referencePosition } = settings.normalisation;
  const result = normalise(converted.points, method, {
    range,
    referencePosition,
    tolerance: settings.tolerance,
    orientation
  });

  return {
    reading,
    orientation,
    points: result.isOk ? result.points : converted.points,
    isNormalised: result.isOk && method !== 'none',
    dropped: converted.dropped,
    normaliseProblem: result.isOk ? null : result.reason
  };
};
