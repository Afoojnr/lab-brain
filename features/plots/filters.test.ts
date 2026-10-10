import { describe, expect, it } from 'vitest';

import {
  applyFilters,
  describeFilters,
  distinctValues,
  isFilterActive
} from './filters';
import type { PlotFilter, PlotRow } from './types';

const row = (id: string, values: PlotRow['values']): PlotRow => ({
  id,
  label: id,
  href: null,
  values,
  groups: []
});

const ROWS = [
  row('a', { cycles: 600, gas: 'N2' }),
  row('b', { cycles: 800, gas: 'Ar' }),
  row('c', { cycles: 600, gas: 'Ar' }),
  row('d', { gas: 'N2' })
];
const ids = (rows: PlotRow[]) => rows.map(item => item.id);

describe('applyFilters', () => {
  it('keeps everything when no filter restricts anything yet', () => {
    const filters: PlotFilter[] = [
      { type: 'values', key: 'cycles', values: [] },
      { type: 'range', key: 'cycles', min: '', max: 'abc' }
    ];

    expect(applyFilters(ROWS, filters)).toEqual({ rows: ROWS, filteredOut: 0 });
  });

  it('keeps rows whose value is one of the ticked values', () => {
    const result = applyFilters(ROWS, [
      { type: 'values', key: 'cycles', values: [600] }
    ]);

    expect(ids(result.rows)).toEqual(['a', 'c']);
    expect(result.filteredOut).toBe(2);
  });

  it('drops a row with no value for an active filter, never treating it as 0', () => {
    const result = applyFilters(ROWS, [
      { type: 'range', key: 'cycles', min: '0', max: '' }
    ]);

    expect(ids(result.rows)).toEqual(['a', 'b', 'c']);
  });

  it('keeps rows inside a range, bounds included, with a decimal comma', () => {
    const rows = [row('a', { t: 1.5 }), row('b', { t: 2 }), row('c', { t: 3 })];

    expect(
      ids(
        applyFilters(rows, [{ type: 'range', key: 't', min: '1,5', max: '2' }])
          .rows
      )
    ).toEqual(['a', 'b']);
    expect(
      ids(
        applyFilters(rows, [{ type: 'range', key: 't', min: '', max: '1.5' }])
          .rows
      )
    ).toEqual(['a']);
  });

  it('treats an empty bound as open, not as 0, so negative values stay', () => {
    const rows = [row('a', { t: -5 }), row('b', { t: 5 })];

    expect(
      ids(
        applyFilters(rows, [{ type: 'range', key: 't', min: '', max: '0' }])
          .rows
      )
    ).toEqual(['a']);
    expect(
      ids(
        applyFilters(rows, [{ type: 'range', key: 't', min: '-10', max: '' }])
          .rows
      )
    ).toEqual(['a', 'b']);
  });

  it('combines filters with "and"', () => {
    const result = applyFilters(ROWS, [
      { type: 'values', key: 'cycles', values: [600] },
      { type: 'values', key: 'gas', values: ['Ar'] }
    ]);

    expect(ids(result.rows)).toEqual(['c']);
  });

  it('does not match a range against text', () => {
    const result = applyFilters(ROWS, [
      { type: 'range', key: 'gas', min: '0', max: '' }
    ]);

    expect(result.rows).toEqual([]);
  });
});

describe('isFilterActive', () => {
  it('is false for an empty selection and for bounds that are not numbers', () => {
    expect(isFilterActive({ type: 'values', key: 'a', values: [] })).toBe(
      false
    );
    expect(isFilterActive({ type: 'range', key: 'a', min: 'x', max: '' })).toBe(
      false
    );
    expect(isFilterActive({ type: 'range', key: 'a', min: '0', max: '' })).toBe(
      true
    );
  });
});

describe('distinctValues', () => {
  it('lists each value once: numbers ascending, text A to Z, no empty text', () => {
    expect(distinctValues(ROWS, 'cycles')).toEqual([600, 800]);
    expect(distinctValues(ROWS, 'gas')).toEqual(['Ar', 'N2']);
    expect(distinctValues([row('x', { g: '' })], 'g')).toEqual([]);
  });
});

describe('describeFilters', () => {
  const columns = [
    { key: 'c', name: 'Cycles', unit: null },
    { key: 't', name: 'Temperature', unit: '°C' }
  ];

  it('writes one short line per active filter', () => {
    expect(
      describeFilters(
        [
          { type: 'values', key: 'c', values: [600, 800] },
          { type: 'range', key: 't', min: '150', max: '250' }
        ],
        columns
      )
    ).toEqual(['Cycles: 600, 800', 'Temperature (°C): 150 – 250']);
  });

  it('writes one bound with its sign, and skips filters that restrict nothing', () => {
    expect(
      describeFilters(
        [
          { type: 'range', key: 't', min: '150', max: '' },
          { type: 'range', key: 't', min: '', max: '0' },
          { type: 'values', key: 'c', values: [] }
        ],
        columns
      )
    ).toEqual(['Temperature (°C): ≥ 150', 'Temperature (°C): ≤ 0']);
  });
});
