import { describe, expect, it } from 'vitest';

import type { BatchRow } from './batch-types';
import {
  cellChange,
  isAppliedByDefault,
  rowValues,
  valueDefinitions
} from './batch-preview';

const row = (overrides: Partial<BatchRow> = {}): BatchRow => ({
  characterizationId: 'c1',
  sampleId: 's1',
  sampleCode: 'ALD001',
  measuredOn: null,
  technique: 'EDX',
  currentValues: {},
  edx: {
    spots: [
      { id: 'a', label: 'a', atomic: { B: 0.5, N: 0.3 }, spectrum: null },
      { id: 'b', label: 'b', atomic: { B: 0.6, N: 0.3 }, spectrum: null }
    ],
    problems: [],
    excludedSpots: []
  },
  ellipsometry: null,
  ...overrides
});
const RATIO = { numerator: 'B', denominator: 'N' };

describe('cellChange', () => {
  it('fills an empty cell, leaves an equal one, and flags a different one', () => {
    expect(cellChange(undefined, 1.5)).toBe('fill');
    expect(cellChange(1.5, 1.5)).toBe('same');
    expect(cellChange(1.4, 1.5)).toBe('replace');
    expect(cellChange('text', 1.5)).toBe('replace');
  });
});

describe('isAppliedByDefault', () => {
  it('updates rows that fill or keep, and skips a row that would replace a different value', () => {
    expect(isAppliedByDefault(['fill', 'fill'])).toBe(true);
    expect(isAppliedByDefault(['fill', 'same'])).toBe(true);
    expect(isAppliedByDefault(['fill', 'replace'])).toBe(false);
    expect(isAppliedByDefault([])).toBe(true);
  });
});

describe('rowValues', () => {
  it('computes EDX values from the spots that are left in', () => {
    const all = rowValues(row(), RATIO, []);
    const without = rowValues(row(), RATIO, ['b']);

    expect(all?.find(value => value.id === 'el:B')?.value).toBeCloseTo(55, 10);
    expect(without?.find(value => value.id === 'el:B')?.value).toBeCloseTo(
      50,
      10
    );
  });

  it('is null, not zeros, when every spot is left out or there are none', () => {
    expect(rowValues(row(), RATIO, ['a', 'b'])).toBeNull();
    expect(
      rowValues(
        row({ edx: { spots: [], problems: [], excludedSpots: [] } }),
        RATIO,
        []
      )
    ).toBeNull();
  });

  it('reads ellipsometry from the file summary, or is null when there is none', () => {
    const summary = {
      thickness: { mean: 11, std: 1 },
      n: { mean: 1.6, std: 0.1 },
      points: []
    };
    const ellipsometry = row({
      edx: null,
      ellipsometry: { summary, reason: null }
    });

    expect(
      rowValues(ellipsometry, RATIO, [])?.map(value => value.value)
    ).toEqual([11, 1, 1.6, 0.1]);
    expect(
      rowValues(
        row({ edx: null, ellipsometry: { summary: null, reason: 'noFile' } }),
        RATIO,
        []
      )
    ).toBeNull();
  });
});

describe('valueDefinitions', () => {
  it('names the EDX ratio after the chosen pair, and lists the four ellipsometry values', () => {
    expect(
      valueDefinitions('edx', { numerator: 'B', denominator: 'C' })[0]?.label
    ).toBe('B/C');
    expect(
      valueDefinitions('ellipsometry', RATIO).map(value => value.id)
    ).toEqual(['thickness', 'thickness:std', 'n', 'n:std']);
  });
});
