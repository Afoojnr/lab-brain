import type { AnalysisValue } from '../../types';
import type { ProcessedSpectrum } from './process';
import { strongestNear } from './transform';
import type { FtirPeak, FtirSettings } from './types';

/** The unit of a peak's value: relative once normalised, % for transmittance, none for absorbance. */
export const ftirUnit = (spectrum: ProcessedSpectrum): string | null => {
  if (spectrum.isNormalised) return 'a.u.';

  return spectrum.reading === 'transmittance' ? '%' : null;
};

/** "1100 cm⁻¹ — B–C", with "(relative)" when the spectrum was normalised. */
export const peakLabel = (
  peak: FtirPeak,
  spectrum: ProcessedSpectrum
): string => {
  const position = `${Number(peak.position.toFixed(1))} cm⁻¹`;
  const label =
    peak.label.trim() === '' ? position : `${position} — ${peak.label.trim()}`;

  return spectrum.isNormalised ? `${label} (relative)` : label;
};

/**
 * The value at each of the user's peaks: the strongest point within the
 * tolerance of its position, from the raw numbers (converted or normalised only
 * as chosen). A peak with no data near it gives no value, never 0.
 *
 * @param spectrum - The processed spectrum.
 * @param settings - The user's peaks and tolerance.
 */
export const ftirValues = (
  spectrum: ProcessedSpectrum,
  settings: Pick<FtirSettings, 'peaks' | 'tolerance'>
): AnalysisValue[] =>
  settings.peaks.flatMap(peak => {
    const point = strongestNear(
      spectrum.points,
      peak.position,
      settings.tolerance,
      spectrum.orientation
    );

    return point
      ? [
          {
            id: `peak:${peak.id}`,
            label: peakLabel(peak, spectrum),
            unit: ftirUnit(spectrum),
            value: point.y
          }
        ]
      : [];
  });
