import { describe, expect, it } from 'vitest';

import { computePlot } from './compute-plot';
import type { PlotTable } from './from-table';
import type { PlotSettings } from '../types';

const TABLE: PlotTable = {
  columns: [
    { key: 'x', name: 'X', unit: null, kind: 'number' },
    { key: 'y', name: 'Y', unit: null, kind: 'number' },
    { key: 'c', name: 'Cycles', unit: null, kind: 'number' }
  ],
  rows: [
    {
      id: 'a',
      label: 'A',
      href: null,
      values: { x: 1, y: 1, c: 600 },
      groups: []
    },
    {
      id: 'b',
      label: 'B',
      href: null,
      values: { x: 2, y: 2, c: 800 },
      groups: []
    },
    { id: 'c', label: 'C', href: null, values: { x: 3, c: 600 }, groups: [] },
    {
      id: 'd',
      label: 'D',
      href: null,
      values: { x: 4, y: 4, c: 600 },
      groups: []
    }
  ]
};
const SETTINGS: PlotSettings = {
  x: 'x',
  y: 'y',
  error: null,
  group: { type: 'column', key: 'c' },
  logX: false,
  logY: false
};

describe('computePlot', () => {
  it('plots what has both numbers and counts what is left out', () => {
    const plot = computePlot(TABLE, {
      settings: SETTINGS,
      filters: [],
      untickedIds: []
    });

    expect(plot.plotted).toBe(3);
    expect(plot.leftOut.missing).toBe(1);
    expect(plot.points.map(point => point.rowId)).toEqual(['a', 'd', 'b']);
  });

  it('removes unticked samples from the plot but keeps them in the list to choose from', () => {
    const plot = computePlot(TABLE, {
      settings: SETTINGS,
      filters: [],
      untickedIds: ['a']
    });

    expect(plot.plotted).toBe(2);
    expect(plot.points.map(point => point.rowId)).toContain('a');
  });

  it('applies filters and keeps a group on its colour slot while others are filtered out', () => {
    const plot = computePlot(TABLE, {
      settings: SETTINGS,
      filters: [{ type: 'values', key: 'c', values: [800] }],
      untickedIds: []
    });

    expect(plot.filteredOut).toBe(3);
    expect(plot.series.map(series => series.key)).toEqual(['800']);
    expect(plot.colorOrder).toEqual(['600', '800']);
  });
});
