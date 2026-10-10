import { describe, expect, it } from 'vitest';

import { restoreSaved } from './restore';
import { DEFAULT_STYLE } from './style';
import type { PlotColumn } from './types';

const col = (
  key: string,
  kind: PlotColumn['kind'],
  role?: PlotColumn['role']
): PlotColumn => ({ key, name: key, unit: null, kind, role });

const COLUMNS = [
  col('temp', 'number', 'parameter'),
  col('thick', 'number', 'result'),
  col('gas', 'text')
];
const SAVED = {
  settings: {
    x: 'temp',
    y: 'thick',
    error: null,
    group: { type: 'column' as const, key: 'gas' },
    logX: true,
    logY: false
  },
  filters: [{ type: 'values' as const, key: 'gas', values: ['N2'] }],
  untickedIds: ['a'],
  style: DEFAULT_STYLE
};

describe('restoreSaved', () => {
  it('returns what was saved when every column is still there', () => {
    expect(restoreSaved(COLUMNS, SAVED)).toEqual(SAVED);
  });

  it('falls back to the default axes and drops what points at a removed column', () => {
    const restored = restoreSaved(
      COLUMNS.filter(column => column.key !== 'gas'),
      { ...SAVED, settings: { ...SAVED.settings, x: 'gone', error: 'gone' } }
    );

    expect(restored?.settings).toMatchObject({
      x: 'temp',
      y: 'thick',
      error: null,
      group: { type: 'none' },
      logX: true
    });
    expect(restored?.filters).toEqual([]);
    expect(restored?.untickedIds).toEqual(['a']);
  });

  it('is null when there are no longer two columns of numbers', () => {
    expect(restoreSaved([col('temp', 'number')], SAVED)).toBeNull();
  });
});
