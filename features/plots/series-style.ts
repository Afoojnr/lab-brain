import type { PlotSeries } from './types';

export type SeriesShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';

export type SeriesStyle = { color: string; shape: SeriesShape };

/** Slots 1-3 of the validated palette, the most that can be told apart on a scatter plot. */
export const SERIES_STYLES: readonly SeriesStyle[] = [
  { color: 'var(--plot-1)', shape: 'circle' },
  { color: 'var(--plot-2)', shape: 'square' },
  { color: 'var(--plot-3)', shape: 'triangle' }
];
const MUTED = 'var(--muted-foreground)';

/**
 * The colour and marker shape of a series. A named group keeps the slot it
 * has among all the groups of the table (`colorOrder`), so filtering or
 * unticking never repaints it; the rows without a group are grey.
 *
 * @param series - The series.
 * @param index - Its position among the shown series, used when it has no slot.
 * @param colorOrder - Group keys of the whole table.
 */
export const seriesStyle = (
  series: PlotSeries,
  index: number,
  colorOrder: string[]
): SeriesStyle => {
  if (series.kind === 'group' || series.kind === 'all') {
    const slot = colorOrder.indexOf(series.key);

    return SERIES_STYLES[
      slot >= 0 && slot < SERIES_STYLES.length
        ? slot
        : index % SERIES_STYLES.length
    ];
  }

  return { color: MUTED, shape: series.kind === 'other' ? 'star' : 'diamond' };
};

/** The name shown for a series; the labels are translated by the caller. */
export const seriesLabel = (
  series: PlotSeries,
  labels: { noStudy: string; noValue: string; other: string }
) =>
  series.name ??
  (series.kind === 'noStudy'
    ? labels.noStudy
    : series.kind === 'noValue'
      ? labels.noValue
      : series.kind === 'other'
        ? labels.other
        : '');
