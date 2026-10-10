import type {
  LeftOut,
  PlotPoint,
  PlotRow,
  PlotSeries,
  PlotSettings
} from './types';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const NO_STUDY = '\u0000noStudy';
const NO_VALUE = '\u0000noValue';

const groupNames = (row: PlotRow, settings: PlotSettings): string[] => {
  if (settings.group.type === 'none') return [''];
  if (settings.group.type === 'study') {
    return row.groups.length > 0 ? row.groups : [NO_STUDY];
  }

  // A number column groups by each distinct number, written as it is.
  const value = row.values[settings.group.key];
  const text = typeof value === 'string' ? value.trim() : String(value ?? '');
  return [text === '' ? NO_VALUE : text];
};

/**
 * Turns rows into the series a scatter plot draws. A row with no number for X
 * or Y is left out and counted, never plotted as 0; on a logarithmic axis a
 * value of 0 or less is left out and counted. An error bar is drawn only from a
 * number that is 0 or more. A row in several studies appears once in each
 * (and is counted once as plotted); one in none goes to "no study".
 *
 * @param rows - The rows to plot.
 * @param settings - What is on each axis, the error column, the grouping and the log axes.
 */
export const buildSeries = (
  rows: PlotRow[],
  settings: PlotSettings
): { series: PlotSeries[]; plotted: number; leftOut: LeftOut } => {
  const leftOut: LeftOut = { missing: 0, notPositive: 0 };
  const groups = new Map<string, PlotPoint[]>();
  let plotted = 0;

  for (const row of rows) {
    const x = row.values[settings.x];
    const y = row.values[settings.y];
    if (!isNumber(x) || !isNumber(y)) {
      leftOut.missing += 1;
      continue;
    }
    if ((settings.logX && x <= 0) || (settings.logY && y <= 0)) {
      leftOut.notPositive += 1;
      continue;
    }

    const errorValue = settings.error ? row.values[settings.error] : undefined;
    const point: PlotPoint = {
      x,
      y,
      ...(isNumber(errorValue) && errorValue >= 0 ? { error: errorValue } : {}),
      rowId: row.id,
      label: row.label,
      href: row.href
    };
    plotted += 1;
    for (const name of groupNames(row, settings)) {
      groups.set(name, [...(groups.get(name) ?? []), point]);
    }
  }

  const series = [...groups.entries()]
    .map(([name, points]): PlotSeries => {
      const kind =
        settings.group.type === 'none'
          ? 'all'
          : name === NO_STUDY
            ? 'noStudy'
            : name === NO_VALUE
              ? 'noValue'
              : 'group';

      return { key: name, name: kind === 'group' ? name : null, kind, points };
    })
    .sort((a, b) => {
      const isSpecial = (series: PlotSeries) =>
        series.kind === 'noStudy' || series.kind === 'noValue';
      if (isSpecial(a) !== isSpecial(b)) return isSpecial(a) ? 1 : -1;

      return (a.name ?? '').localeCompare(b.name ?? '', undefined, {
        numeric: true
      });
    });

  return { series, plotted, leftOut };
};

/**
 * Keeps the first `max` named groups and folds the rest into one "other"
 * series, because only a few colours can be told apart on a scatter plot. The
 * rows without a group are kept as they are. Points of a row in several folded
 * groups appear once.
 *
 * @param series - The series from {@link buildSeries}.
 * @param max - How many named groups to keep.
 * @param order - Group keys in the order to keep them (e.g. from all the
 *   rows), so filtering or unticking never changes which groups stay named.
 */
export const foldSeries = (
  series: PlotSeries[],
  max: number,
  order: string[] = []
): { series: PlotSeries[]; foldedCount: number } => {
  const rank = (item: PlotSeries) => {
    const index = order.indexOf(item.key);
    return index === -1 ? order.length : index;
  };
  const named = series
    .filter(item => item.kind === 'group')
    .sort((a, b) => rank(a) - rank(b));
  if (named.length <= max) return { series, foldedCount: 0 };

  const folded = named.slice(max);
  const seen = new Set<string>();
  const points = folded
    .flatMap(item => item.points)
    .filter(point => !seen.has(point.rowId) && seen.add(point.rowId));
  const kept = new Set(named.slice(0, max));

  return {
    series: [
      ...series.filter(item => item.kind !== 'group' || kept.has(item)),
      { key: '\u0000other', name: null, kind: 'other', points }
    ],
    foldedCount: folded.length
  };
};
