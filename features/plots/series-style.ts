import type { PlotSeries } from './types';

export type SeriesShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';

export type SeriesStyle = { color: string; shape: SeriesShape };

/** The three colours of the validated palette: the most that can be told apart by colour alone. */
const COLORS = ['var(--plot-1)', 'var(--plot-2)', 'var(--plot-3)'] as const;
const SHAPES: readonly SeriesShape[] = [
  'circle',
  'square',
  'triangle',
  'diamond'
];

/**
 * How many groups can each have their own look: every group gets one of the
 * three colours and one of four shapes, and because 3 and 4 share no factor, no
 * two of the first twelve groups share both. Past that, groups are folded.
 */
export const MAX_STYLED_GROUPS = COLORS.length * SHAPES.length;

/** The look of the n-th group (0-based), from 0 up to {@link MAX_STYLED_GROUPS}. */
export const groupStyle = (slot: number): SeriesStyle => ({
  color: COLORS[slot % COLORS.length],
  shape: SHAPES[slot % SHAPES.length]
});
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

    return groupStyle(
      slot >= 0 && slot < MAX_STYLED_GROUPS ? slot : index % MAX_STYLED_GROUPS
    );
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
