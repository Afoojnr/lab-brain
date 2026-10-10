import { describe, expect, it } from 'vitest';

import { seriesLabel, seriesStyle } from './series-style';
import type { PlotSeries } from './types';

const series = (key: string, kind: PlotSeries['kind']): PlotSeries => ({
  key,
  name: kind === 'group' ? key : null,
  kind,
  points: []
});

describe('seriesStyle', () => {
  it('keeps a group on the slot it has among all the groups, whatever is shown', () => {
    const order = ['600', '800'];

    expect(seriesStyle(series('800', 'group'), 0, order).color).toBe(
      'var(--plot-2)'
    );
    expect(seriesStyle(series('600', 'group'), 0, order).color).toBe(
      'var(--plot-1)'
    );
  });

  it('falls back to the position when the group is not among the first three', () => {
    expect(
      seriesStyle(series('x', 'group'), 1, ['a', 'b', 'c', 'x']).color
    ).toBe('var(--plot-2)');
  });

  it('greys the rows without a group, each with its own shape', () => {
    expect(seriesStyle(series('', 'noStudy'), 0, [])).toEqual({
      color: 'var(--muted-foreground)',
      shape: 'diamond'
    });
    expect(seriesStyle(series('', 'other'), 0, []).shape).toBe('star');
  });
});

describe('seriesLabel', () => {
  const labels = { noStudy: 'No study', noValue: 'No value', other: 'Other' };

  it('uses the group name, or the translated label for the special series', () => {
    expect(seriesLabel(series('A', 'group'), labels)).toBe('A');
    expect(seriesLabel(series('', 'noStudy'), labels)).toBe('No study');
    expect(seriesLabel(series('', 'other'), labels)).toBe('Other');
    expect(seriesLabel(series('', 'all'), labels)).toBe('');
  });
});
