import { describe, expect, it } from 'vitest';

import { MAX_STYLED_GROUPS, seriesLabel, seriesStyle } from './series-style';
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

  it('gives each of the first twelve groups its own colour and shape pair', () => {
    const order = Array.from(
      { length: MAX_STYLED_GROUPS },
      (_, index) => `g${index}`
    );
    const looks = order.map(key => {
      const look = seriesStyle(series(key, 'group'), 0, order);
      return `${look.color}/${look.shape}`;
    });

    expect(new Set(looks).size).toBe(12);
    expect(looks.slice(0, 3)).toEqual([
      'var(--plot-1)/circle',
      'var(--plot-2)/square',
      'var(--plot-3)/triangle'
    ]);
  });

  it('falls back to the position when the group has no slot', () => {
    expect(seriesStyle(series('x', 'group'), 1, ['a', 'b']).color).toBe(
      'var(--plot-2)'
    );
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
