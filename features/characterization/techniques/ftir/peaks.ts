import type {
  FtirPeak,
  PeakOrientation,
  SpectrumPoint,
  WavenumberRange
} from './types';

export type DetectedPeak = {
  /** Wavenumber (cm⁻¹) of the raw data point. */
  x: number;
  /** The raw value at that point. */
  y: number;
  /** How far it stands out from its surroundings, in the spectrum's units. */
  prominence: number;
};

export type DetectOptions = {
  orientation: PeakOrientation;
  /** Where to look; null means the whole spectrum. */
  range: WavenumberRange | null;
  /** The least prominence, as a fraction of the spectrum's span (0–1). */
  sensitivity: number;
  /** Peaks closer than this (cm⁻¹) count once: the more prominent stays. */
  minSpacing: number;
  /** Points averaged to calm noise before looking; odd, 1 means none. */
  smoothing?: number;
};

const movingAverage = (values: number[], width: number): number[] => {
  const half = Math.floor(width / 2);

  return values.map((_value, index) => {
    const from = Math.max(index - half, 0);
    const to = Math.min(index + half, values.length - 1);
    let sum = 0;
    for (let i = from; i <= to; i += 1) sum += values[i];

    return sum / (to - from + 1);
  });
};

/** How far a tip at `index` rises above the higher of the two valleys on its sides, until a taller point. */
const prominenceOf = (values: number[], index: number): number => {
  const height = values[index];
  let leftValley = height;
  for (let i = index - 1; i >= 0 && values[i] <= height; i -= 1) {
    leftValley = Math.min(leftValley, values[i]);
  }
  let rightValley = height;
  for (let i = index + 1; i < values.length && values[i] <= height; i += 1) {
    rightValley = Math.min(rightValley, values[i]);
  }

  return height - Math.max(leftValley, rightValley);
};

/**
 * Suggests the peaks of a spectrum: the dips of a transmittance spectrum or the
 * tips of an absorbance one. The spectrum is lightly smoothed to find them; each
 * peak is reported at the raw data point nearest the top, with the raw value. A
 * peak is kept when it stands out by at least `sensitivity` × the spectrum's
 * span. The first and last points cannot be peaks, so the noisy edge of a scan is
 * never one. These are suggestions for the user to curate, not assignments.
 *
 * @param points - The spectrum, wavenumber ascending.
 * @param options - Orientation, interval, sensitivity and spacing.
 */
export const detectPeaks = (
  points: SpectrumPoint[],
  options: DetectOptions
): DetectedPeak[] => {
  if (points.length < 3) return [];

  const sign = options.orientation === 'tip' ? 1 : -1;
  const raw = points.map(point => sign * point.y);
  const smooth = movingAverage(raw, options.smoothing ?? 5);
  const span = Math.max(...raw) - Math.min(...raw);
  if (span === 0) return [];

  const half = Math.floor((options.smoothing ?? 5) / 2);
  const found: DetectedPeak[] = [];
  for (let i = 1; i < points.length - 1; i += 1) {
    const x = points[i].x;
    const isInRange =
      !options.range || (x >= options.range.from && x <= options.range.to);
    const isTop = smooth[i] >= smooth[i - 1] && smooth[i] > smooth[i + 1];
    if (!isInRange || !isTop) continue;

    const prominence = prominenceOf(smooth, i);
    if (prominence < options.sensitivity * span) continue;

    // The raw extremum close to the smoothed top is the point to report.
    let best = i;
    for (
      let j = Math.max(i - half, 0);
      j <= Math.min(i + half, raw.length - 1);
      j += 1
    ) {
      if (raw[j] > raw[best]) best = j;
    }
    found.push({ x: points[best].x, y: points[best].y, prominence });
  }

  const kept: DetectedPeak[] = [];
  for (const peak of [...found].sort((a, b) => b.prominence - a.prominence)) {
    if (kept.every(other => Math.abs(other.x - peak.x) >= options.minSpacing)) {
      kept.push(peak);
    }
  }

  return kept.sort((a, b) => a.x - b.x);
};

/**
 * Peaks to offer for several spectra at once: every spectrum's detected peaks,
 * with ones closer than `minSpacing` counted once (the first stays), in
 * wavenumber order.
 *
 * @param lists - The detected peaks of each spectrum.
 * @param minSpacing - Positions closer than this (cm⁻¹) are the same peak.
 */
export const unionOfPeaks = (
  lists: DetectedPeak[][],
  minSpacing: number
): number[] => {
  const positions: number[] = [];
  for (const peak of lists.flat()) {
    if (
      positions.every(position => Math.abs(position - peak.x) >= minSpacing)
    ) {
      positions.push(peak.x);
    }
  }

  return positions.sort((a, b) => a - b);
};

/**
 * Updates the user's peaks with new suggestions without losing their work: a
 * peak that already has a label stays exactly as it is; every other earlier
 * suggestion is replaced; and a new position is added only if it is not within
 * `minSpacing` of one that stays.
 *
 * @param peaks - The peaks the user has now.
 * @param suggested - The suggested positions.
 * @param minSpacing - Positions closer than this (cm⁻¹) are the same peak.
 * @param newId - Makes an id for a new peak.
 */
export const mergeSuggestions = (
  peaks: FtirPeak[],
  suggested: number[],
  minSpacing: number,
  newId: () => string
): FtirPeak[] => {
  const kept = peaks.filter(peak => peak.label.trim() !== '');
  const added = suggested
    .filter(position =>
      kept.every(peak => Math.abs(peak.position - position) >= minSpacing)
    )
    .map(position => ({ id: newId(), position, label: '' }));

  return [...kept, ...added].sort((a, b) => a.position - b.position);
};
