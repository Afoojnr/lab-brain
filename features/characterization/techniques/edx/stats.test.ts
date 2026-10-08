import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EDX_VALUE_IDS,
  edxValues,
  ratioOf,
  substrateOf,
  summarizeSpots
} from './stats';
import type { Spot } from './types';

const spot = (id: string, atomic: Record<string, number>): Spot => ({
  id,
  label: id,
  atomic,
  spectrum: null
});

// Fake numbers, worked out by hand: B 50/40/60, N 30/30/30, C 0/10/0 (percent).
const SPOTS = [
  spot('s1', { B: 0.5, N: 0.3 }),
  spot('s2', { B: 0.4, N: 0.3, C: 0.1 }),
  spot('s3', { B: 0.6, N: 0.3 })
];

describe('summarizeSpots', () => {
  it('averages in percent with the std divided by N', () => {
    const stats = summarizeSpots(SPOTS);

    expect(stats.B?.mean).toBeCloseTo(50, 10);
    expect(stats.B?.std).toBeCloseTo(8.164966, 5); // √(200/3), not √(200/2)
    expect(stats.N).toEqual({ mean: expect.closeTo(30, 10), std: 0 });
  });

  it('counts an element missing from a spot as 0 there', () => {
    const stats = summarizeSpots(SPOTS);

    expect(stats.C?.mean).toBeCloseTo(10 / 3, 10);
    expect(stats.C?.std).toBeCloseTo(4.714045, 5);
  });

  it('knows only the elements of the spots it is given', () => {
    const stats = summarizeSpots([SPOTS[0]!, SPOTS[2]!]);

    expect(Object.keys(stats)).toEqual(['B', 'N']);
    expect(stats.B?.mean).toBeCloseTo(55, 10);
    expect(stats.B?.std).toBeCloseTo(5, 10);
  });
});

describe('ratioOf', () => {
  const stats = summarizeSpots(SPOTS);

  it('divides the means and propagates the std', () => {
    const ratio = ratioOf(stats, 'B', 'N');

    expect(ratio.value).toBeCloseTo(50 / 30, 10);
    // r · √((s_B/m_B)² + (s_N/m_N)²) with s_N = 0
    expect(ratio.std).toBeCloseTo((50 / 30) * (8.164966 / 50), 5);
    expect(ratio.isAvailable).toBe(true);
  });

  it('can use any two elements', () => {
    expect(ratioOf(stats, 'C', 'N').value).toBeCloseTo(10 / 3 / 30, 10);
  });

  it('is 0 and flagged, never NaN, when an element is absent or its mean is 0', () => {
    expect(ratioOf(stats, 'B', 'O')).toEqual({
      value: 0,
      std: 0,
      isAvailable: false
    });
    expect(ratioOf(stats, 'Ti', 'N')).toEqual({
      value: 0,
      std: 0,
      isAvailable: false
    });
    const zero = summarizeSpots([spot('z', { B: 0, N: 0.2 })]);
    expect(ratioOf(zero, 'B', 'N').isAvailable).toBe(false);
  });
});

describe('substrateOf', () => {
  it('takes the first substrate element that is present, in the notebook order', () => {
    const stats = summarizeSpots([spot('a', { Si: 0.2, Ni: 0.5, B: 0.3 })]);

    expect(substrateOf(stats).symbol).toBe('Si');
  });

  it('is 0 when there is none', () => {
    expect(substrateOf(summarizeSpots(SPOTS))).toEqual({
      symbol: null,
      mean: 0,
      std: 0
    });
  });
});

describe('edxValues', () => {
  it('offers the ratio, each element and the substrate, each with its std', () => {
    const values = edxValues(SPOTS, 'B', 'N');
    const byId = Object.fromEntries(values.map(value => [value.id, value]));

    expect(byId.ratio?.label).toBe('B/N');
    expect(byId['ratio:std']?.label).toBe('B/N std');
    expect(byId['el:B']?.value).toBeCloseTo(50, 10);
    expect(byId['el:B:std']?.label).toBe('B std');
    expect(byId.substrate?.value).toBe(0);
  });

  it('shows B, N, C and O even when a spot set has none of them, as 0', () => {
    const values = edxValues([spot('a', { Cu: 1 })], 'B', 'N');
    const byId = Object.fromEntries(values.map(value => [value.id, value]));

    expect(byId['el:O']?.value).toBe(0);
    expect(byId.ratio).toMatchObject({ value: 0, flag: 'unavailable' });
  });

  it('follows the chosen ratio pair', () => {
    const values = edxValues(SPOTS, 'B', 'C');

    expect(values.find(value => value.id === 'ratio')?.label).toBe('B/C');
  });

  it('ticks the ratio, B, N, C, O and the substrate by default', () => {
    expect(DEFAULT_EDX_VALUE_IDS).toContain('ratio');
    expect(DEFAULT_EDX_VALUE_IDS).toContain('el:O:std');
    expect(DEFAULT_EDX_VALUE_IDS).toContain('substrate');
    expect(DEFAULT_EDX_VALUE_IDS).not.toContain('el:Cu');
  });
});
