import { describe, expect, it } from 'vitest';

import { buildSeries, foldSeries } from './plot-model';
import type { PlotRow, PlotSettings } from './types';

const row = (
  id: string,
  values: PlotRow['values'],
  groups: string[] = []
): PlotRow => ({ id, label: id, href: null, values, groups });

const settings: PlotSettings = {
  x: 'x',
  y: 'y',
  error: null,
  group: { type: 'none' },
  logX: false,
  logY: false
};

describe('buildSeries', () => {
  it('plots rows with numbers for X and Y as one series', () => {
    const result = buildSeries(
      [row('a', { x: 1, y: 2 }), row('b', { x: 3, y: 4 })],
      settings
    );

    expect(result.plotted).toBe(2);
    expect(result.series).toHaveLength(1);
    expect(result.series[0].kind).toBe('all');
    expect(result.series[0].points.map(point => [point.x, point.y])).toEqual([
      [1, 2],
      [3, 4]
    ]);
  });

  it('leaves out and counts rows missing X or Y, never plotting them as 0', () => {
    const result = buildSeries(
      [
        row('a', { x: 1, y: 2 }),
        row('b', { x: 1 }),
        row('c', { y: 2 }),
        row('d', { x: 'text', y: 2 })
      ],
      settings
    );

    expect(result.plotted).toBe(1);
    expect(result.leftOut.missing).toBe(3);
    expect(result.series[0].points).toHaveLength(1);
  });

  it('leaves out values of 0 or less on a log axis and counts them', () => {
    const rows = [
      row('a', { x: 1, y: 2 }),
      row('b', { x: 0, y: 2 }),
      row('c', { x: 1, y: -3 })
    ];

    expect(buildSeries(rows, settings).plotted).toBe(3);
    const logX = buildSeries(rows, { ...settings, logX: true });
    expect(logX.plotted).toBe(2);
    expect(logX.leftOut.notPositive).toBe(1);
    const logY = buildSeries(rows, { ...settings, logY: true });
    expect(logY.plotted).toBe(2);
    expect(logY.leftOut.notPositive).toBe(1);
  });

  it('draws an error bar only from a number of 0 or more', () => {
    const result = buildSeries(
      [
        row('a', { x: 1, y: 2, e: 0.5 }),
        row('b', { x: 2, y: 2, e: -1 }),
        row('c', { x: 3, y: 2, e: 'text' }),
        row('d', { x: 4, y: 2 })
      ],
      { ...settings, error: 'e' }
    );

    expect(result.series[0].points.map(point => point.error)).toEqual([
      0.5,
      undefined,
      undefined,
      undefined
    ]);
  });

  it('groups by a text column, putting rows without a value last', () => {
    const result = buildSeries(
      [
        row('a', { x: 1, y: 1, t: 'B' }),
        row('b', { x: 2, y: 2 }),
        row('c', { x: 3, y: 3, t: 'A' }),
        row('d', { x: 4, y: 4, t: '  ' })
      ],
      { ...settings, group: { type: 'column', key: 't' } }
    );

    expect(result.series.map(series => [series.name, series.kind])).toEqual([
      ['A', 'group'],
      ['B', 'group'],
      [null, 'noValue']
    ]);
    expect(result.series[2].points).toHaveLength(2);
  });

  it('groups by a number column, one group per distinct number in order', () => {
    const result = buildSeries(
      [
        row('a', { x: 1, y: 1, c: 800 }),
        row('b', { x: 2, y: 2, c: 600 }),
        row('c', { x: 3, y: 3, c: 800 }),
        row('d', { x: 4, y: 4 })
      ],
      { ...settings, group: { type: 'column', key: 'c' } }
    );

    expect(result.series.map(item => [item.name, item.points.length])).toEqual([
      ['600', 1],
      ['800', 2],
      [null, 1]
    ]);
  });

  it('groups by study: a row in two studies appears in both and counts once', () => {
    const result = buildSeries(
      [
        row('a', { x: 1, y: 1 }, ['S1', 'S2']),
        row('b', { x: 2, y: 2 }, ['S1']),
        row('c', { x: 3, y: 3 })
      ],
      { ...settings, group: { type: 'study' } }
    );

    expect(result.plotted).toBe(3);
    expect(
      result.series.map(series => [series.name, series.points.length])
    ).toEqual([
      ['S1', 2],
      ['S2', 1],
      [null, 1]
    ]);
    expect(result.series[2].kind).toBe('noStudy');
  });
});

describe('foldSeries', () => {
  const rows = ['A', 'B', 'C', 'D', 'E'].map((name, index) =>
    row(name, { x: index, y: index, t: name })
  );
  const { series } = buildSeries(rows, {
    ...settings,
    group: { type: 'column', key: 't' }
  });

  it('keeps everything when the groups fit', () => {
    expect(foldSeries(series, 5)).toEqual({ series, foldedCount: 0 });
  });

  it('folds the groups past the limit into one "other" series after the rest', () => {
    const result = foldSeries(series, 3);

    expect(result.foldedCount).toBe(2);
    expect(result.series.map(item => item.kind)).toEqual([
      'group',
      'group',
      'group',
      'other'
    ]);
    expect(result.series[3].points.map(point => point.rowId)).toEqual([
      'D',
      'E'
    ]);
  });

  it('keeps the groups that come first in the given order', () => {
    const result = foldSeries(series, 2, ['E', 'D', 'A', 'B', 'C']);

    expect(result.series.map(item => item.name)).toEqual(['D', 'E', null]);
    expect(result.series[2].points.map(point => point.rowId)).toEqual([
      'A',
      'B',
      'C'
    ]);
  });

  it('keeps "no value" rows apart from "other"', () => {
    const withBlank = buildSeries([...rows, row('F', { x: 9, y: 9 })], {
      ...settings,
      group: { type: 'column', key: 't' }
    });

    expect(
      foldSeries(withBlank.series, 3).series.map(item => item.kind)
    ).toEqual(['group', 'group', 'group', 'noValue', 'other']);
  });

  it('counts a row in several folded studies once', () => {
    const studies = buildSeries(
      [
        row('a', { x: 1, y: 1 }, ['S1']),
        row('b', { x: 2, y: 2 }, ['S2']),
        row('c', { x: 3, y: 3 }, ['S3', 'S4'])
      ],
      { ...settings, group: { type: 'study' } }
    );
    const result = foldSeries(studies.series, 2);

    expect(result.series.at(-1)?.points.map(point => point.rowId)).toEqual([
      'c'
    ]);
  });
});
