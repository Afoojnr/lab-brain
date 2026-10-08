import type { AnalysisValue } from '../../types';
import type { ElementStat, Spot } from './types';

/** The notebook's substrate list: the first one present is the substrate. */
export const SUBSTRATE_ELEMENTS = ['Cu', 'Si', 'Ni', 'Au', 'Ag'];

/** Always offered, even when absent from every spot (then they are 0). */
export const DEFAULT_ELEMENTS = ['B', 'N', 'C', 'O'];

/**
 * The mean and standard deviation of each element over the spots, in percent.
 * Follows the lab notebook: an element missing from a spot counts as 0 there,
 * and the standard deviation divides by N (not N − 1).
 *
 * @param spots - The spots to average (leave excluded ones out first).
 */
export const summarizeSpots = (spots: Spot[]): Record<string, ElementStat> => {
  const symbols = [
    ...new Set(spots.flatMap(spot => Object.keys(spot.atomic)))
  ].sort();
  const stats: Record<string, ElementStat> = {};

  for (const symbol of symbols) {
    const values = spots.map(spot => (spot.atomic[symbol] ?? 0) * 100);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      values.length;
    stats[symbol] = { mean, std: Math.sqrt(variance) };
  }

  return stats;
};

/**
 * The ratio of two elements' means, with its uncertainty propagated from their
 * standard deviations. When it cannot be computed (an element absent, or a
 * mean of 0) the result is 0 and flagged, as in the notebook, so it can still
 * be plotted; it is never NaN.
 *
 * @param stats - From {@link summarizeSpots}.
 * @param numerator - Element on top, e.g. `B`.
 * @param denominator - Element below, e.g. `N`.
 */
export const ratioOf = (
  stats: Record<string, ElementStat>,
  numerator: string,
  denominator: string
): { value: number; std: number; isAvailable: boolean } => {
  const top = stats[numerator];
  const bottom = stats[denominator];
  if (!top || !bottom || top.mean === 0 || bottom.mean === 0) {
    return { value: 0, std: 0, isAvailable: false };
  }

  const value = top.mean / bottom.mean;
  const std =
    value *
    Math.sqrt((top.std / top.mean) ** 2 + (bottom.std / bottom.mean) ** 2);

  return { value, std, isAvailable: true };
};

/** The substrate element's stats: the first of {@link SUBSTRATE_ELEMENTS} present, else 0. */
export const substrateOf = (
  stats: Record<string, ElementStat>
): { symbol: string | null; mean: number; std: number } => {
  const symbol = SUBSTRATE_ELEMENTS.find(candidate => candidate in stats);

  return symbol && stats[symbol]
    ? { symbol, ...stats[symbol] }
    : { symbol: null, mean: 0, std: 0 };
};

/** The ids ticked by default: the ratio, B, N, C, O and the substrate, each with its std. */
export const DEFAULT_EDX_VALUE_IDS = [
  'ratio',
  'ratio:std',
  ...DEFAULT_ELEMENTS.flatMap(symbol => [`el:${symbol}`, `el:${symbol}:std`]),
  'substrate',
  'substrate:std'
];

/**
 * Every number an EDX analysis can send to the result columns.
 *
 * @param spots - The spots to average (excluded ones already left out).
 * @param numerator - Ratio element on top.
 * @param denominator - Ratio element below.
 */
export const edxValues = (
  spots: Spot[],
  numerator: string,
  denominator: string
): AnalysisValue[] => {
  const stats = summarizeSpots(spots);
  const ratio = ratioOf(stats, numerator, denominator);
  const flag = ratio.isAvailable ? undefined : ('unavailable' as const);
  const substrate = substrateOf(stats);
  const symbols = [...new Set([...DEFAULT_ELEMENTS, ...Object.keys(stats)])];

  return [
    {
      id: 'ratio',
      label: `${numerator}/${denominator}`,
      unit: null,
      value: ratio.value,
      flag
    },
    {
      id: 'ratio:std',
      label: `${numerator}/${denominator} std`,
      unit: null,
      value: ratio.std,
      flag
    },
    ...symbols.flatMap(symbol => [
      {
        id: `el:${symbol}`,
        label: symbol,
        unit: 'at.%',
        value: stats[symbol]?.mean ?? 0
      },
      {
        id: `el:${symbol}:std`,
        label: `${symbol} std`,
        unit: 'at.%',
        value: stats[symbol]?.std ?? 0
      }
    ]),
    {
      id: 'substrate',
      label: 'Substrate',
      unit: 'at.%',
      value: substrate.mean
    },
    {
      id: 'substrate:std',
      label: 'Substrate std',
      unit: 'at.%',
      value: substrate.std
    }
  ];
};
