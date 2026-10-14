import type { SpectrumPoint } from './types';

type Band = { at: number; depth: number; width: number };

/**
 * A made-up spectrum for tests (clearly not instrument data): a flat baseline
 * with Gaussian bands pointing down (transmittance) or up (absorbance) and a
 * little repeatable noise.
 */
export const syntheticSpectrum = ({
  bands,
  from = 600,
  to = 4000,
  step = 2,
  baseline = 80,
  direction = 'down',
  noise = 0.2
}: {
  bands: Band[];
  from?: number;
  to?: number;
  step?: number;
  baseline?: number;
  direction?: 'down' | 'up';
  noise?: number;
}): SpectrumPoint[] => {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;

    return seed / 2147483647 - 0.5;
  };
  const sign = direction === 'down' ? -1 : 1;
  const points: SpectrumPoint[] = [];
  for (let x = from; x <= to; x += step) {
    const bandSum = bands.reduce(
      (sum, band) =>
        sum + band.depth * Math.exp(-(((x - band.at) / band.width) ** 2)),
      0
    );
    points.push({ x, y: baseline + sign * bandSum + noise * random() });
  }

  return points;
};
