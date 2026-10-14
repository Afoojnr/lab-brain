import type { SpectrumPoint } from './types';

/**
 * Thins a spectrum for drawing while keeping its narrow peaks: each stretch of
 * the spectrum keeps its lowest and its highest point, so a one-point dip never
 * disappears the way it would if every nth point were kept.
 */
export const forChart = (
  points: SpectrumPoint[],
  maxPoints: number
): SpectrumPoint[] => {
  if (points.length <= maxPoints) return points;

  const size = Math.ceil(points.length / Math.floor(maxPoints / 2));
  const kept: SpectrumPoint[] = [];
  for (let start = 0; start < points.length; start += size) {
    const bucket = points.slice(start, start + size);
    const low = bucket.reduce((a, b) => (b.y < a.y ? b : a));
    const high = bucket.reduce((a, b) => (b.y > a.y ? b : a));
    kept.push(...(low.x <= high.x ? [low, high] : [high, low]));
  }

  return kept.filter((point, index) => point !== kept[index - 1]);
};

/**
 * The point of a spectrum closest to a wavenumber, so hovering reads every
 * stacked spectrum at the same wavenumber even when their points are not at the
 * same positions.
 */
export const nearestPoint = (
  points: SpectrumPoint[],
  x: number
): SpectrumPoint | null => {
  if (points.length === 0) return null;

  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].x < x) low = middle + 1;
    else high = middle;
  }
  const before = points[Math.max(low - 1, 0)];
  const after = points[low];

  return Math.abs(before.x - x) <= Math.abs(after.x - x) ? before : after;
};
