import type {
  NormalisationMethod,
  PeakOrientation,
  SpectrumPoint,
  WavenumberRange
} from './types';

export type NormaliseOptions = {
  /** Min–max: the interval to scale over; null means the whole spectrum. */
  range: WavenumberRange | null;
  /** Reference peak: the wavenumber whose value becomes 1. */
  referencePosition: number | null;
  /** Reference peak: how far (cm⁻¹) from the position the peak may be. */
  tolerance: number;
  orientation: PeakOrientation;
};

export type NormaliseResult =
  | { isOk: true; points: SpectrumPoint[] }
  | { isOk: false; reason: 'flat' | 'noReference' | 'zeroReference' };

/**
 * Percent transmittance as absorbance: A = 2 − log₁₀(%T). A point at 0 % or
 * below has no absorbance (it would be infinite), so it is left out and counted,
 * never turned into a number.
 *
 * @param points - The spectrum in percent transmittance.
 */
export const toAbsorbance = (
  points: SpectrumPoint[]
): { points: SpectrumPoint[]; dropped: number } => {
  const valid = points.filter(point => point.y > 0);

  return {
    points: valid.map(point => ({ x: point.x, y: 2 - Math.log10(point.y) })),
    dropped: points.length - valid.length
  };
};

const within = (points: SpectrumPoint[], range: WavenumberRange | null) =>
  range
    ? points.filter(point => point.x >= range.from && point.x <= range.to)
    : points;

/** The value of the strongest point within the tolerance of a position, or null when there is none. */
export const strongestNear = (
  points: SpectrumPoint[],
  position: number,
  tolerance: number,
  orientation: PeakOrientation
): SpectrumPoint | null => {
  const near = points.filter(
    point => Math.abs(point.x - position) <= tolerance
  );
  if (near.length === 0) return null;

  return near.reduce((best, point) =>
    (orientation === 'dip' ? point.y < best.y : point.y > best.y) ? point : best
  );
};

const scale = (
  points: SpectrumPoint[],
  convert: (y: number) => number
): NormaliseResult => ({
  isOk: true,
  points: points.map(point => ({ x: point.x, y: convert(point.y) }))
});

/**
 * Scales a spectrum so spectra of different amounts of material can be
 * compared. It never changes the file; the result is relative, not absolute.
 *
 * - `minmax`: lowest → 0 and highest → 1, over the chosen interval.
 * - `peak`: the value at the reference peak → 1.
 * - `vector`: the whole spectrum scaled to length 1.
 * - `snv`: each value minus the mean, over the standard deviation.
 *
 * @param points - The spectrum.
 * @param method - How to scale it.
 * @param options - Interval, reference peak and orientation.
 */
export const normalise = (
  points: SpectrumPoint[],
  method: NormalisationMethod,
  options: NormaliseOptions
): NormaliseResult => {
  const values = points.map(point => point.y);

  if (method === 'none') return { isOk: true, points };

  if (method === 'minmax') {
    const scope = within(points, options.range).map(point => point.y);
    const low = Math.min(...scope);
    const high = Math.max(...scope);

    return scope.length === 0 || high === low
      ? { isOk: false, reason: 'flat' }
      : scale(points, y => (y - low) / (high - low));
  }

  if (method === 'peak') {
    if (options.referencePosition === null) {
      return { isOk: false, reason: 'noReference' };
    }
    const reference = strongestNear(
      points,
      options.referencePosition,
      options.tolerance,
      options.orientation
    );
    if (!reference) return { isOk: false, reason: 'noReference' };

    return reference.y === 0
      ? { isOk: false, reason: 'zeroReference' }
      : scale(points, y => y / reference.y);
  }

  if (method === 'vector') {
    const length = Math.sqrt(values.reduce((sum, y) => sum + y * y, 0));

    return length === 0
      ? { isOk: false, reason: 'flat' }
      : scale(points, y => y / length);
  }

  const mean = values.reduce((sum, y) => sum + y, 0) / values.length;
  const deviation = Math.sqrt(
    values.reduce((sum, y) => sum + (y - mean) ** 2, 0) / values.length
  );

  return deviation === 0
    ? { isOk: false, reason: 'flat' }
    : scale(points, y => (y - mean) / deviation);
};
