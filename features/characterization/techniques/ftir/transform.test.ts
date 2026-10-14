import { describe, expect, it } from 'vitest';

import { normalise, toAbsorbance } from './transform';
import type { NormaliseOptions } from './transform';

const OPTIONS: NormaliseOptions = {
  range: null,
  referencePosition: null,
  tolerance: 5,
  orientation: 'tip'
};
const points = [
  { x: 1000, y: 1 },
  { x: 1100, y: 3 },
  { x: 1200, y: 5 }
];

describe('toAbsorbance', () => {
  it('converts percent transmittance with A = 2 − log10(%T)', () => {
    const { points: converted } = toAbsorbance([
      { x: 1, y: 100 },
      { x: 2, y: 10 },
      { x: 3, y: 1 }
    ]);

    expect(converted.map(point => point.y)).toEqual([0, 1, 2]);
  });

  it('leaves out a point at 0 % or below and counts it, never an infinite value', () => {
    const result = toAbsorbance([
      { x: 1, y: 50 },
      { x: 2, y: 0 },
      { x: 3, y: -1 }
    ]);

    expect(result.points).toHaveLength(1);
    expect(result.dropped).toBe(2);
  });
});

describe('normalise', () => {
  it('leaves the spectrum alone for none', () => {
    expect(normalise(points, 'none', OPTIONS)).toEqual({ isOk: true, points });
  });

  it('scales the lowest to 0 and the highest to 1 over the chosen interval', () => {
    const whole = normalise(points, 'minmax', OPTIONS);
    expect(whole.isOk && whole.points.map(p => p.y)).toEqual([0, 0.5, 1]);

    const part = normalise(points, 'minmax', {
      ...OPTIONS,
      range: { from: 1100, to: 1200 }
    });
    expect(part.isOk && part.points.map(p => p.y)).toEqual([-1, 0, 1]);
  });

  it('makes the value at the reference peak 1', () => {
    const result = normalise(points, 'peak', {
      ...OPTIONS,
      referencePosition: 1100
    });

    expect(result.isOk && result.points.map(p => p.y)).toEqual([
      1 / 3,
      1,
      5 / 3
    ]);
  });

  it('says why a reference peak cannot be used', () => {
    expect(normalise(points, 'peak', OPTIONS)).toEqual({
      isOk: false,
      reason: 'noReference'
    });
    expect(
      normalise(points, 'peak', { ...OPTIONS, referencePosition: 3000 })
    ).toEqual({ isOk: false, reason: 'noReference' });
    expect(
      normalise(
        [
          { x: 1000, y: 0 },
          { x: 1100, y: 2 }
        ],
        'peak',
        {
          ...OPTIONS,
          referencePosition: 1000
        }
      )
    ).toEqual({ isOk: false, reason: 'zeroReference' });
  });

  it('scales to unit length for vector and to zero mean, unit spread for SNV', () => {
    const vector = normalise(points, 'vector', OPTIONS);
    const length = Math.sqrt(1 + 9 + 25);
    expect(vector.isOk && vector.points[2].y).toBeCloseTo(5 / length);

    const snv = normalise(points, 'snv', OPTIONS);
    expect(snv.isOk && snv.points.map(p => p.y)[1]).toBeCloseTo(0);
    expect(snv.isOk && snv.points[2].y).toBeCloseTo(Math.sqrt(1.5));
  });

  it('refuses to scale a flat spectrum instead of dividing by zero', () => {
    const flat = [
      { x: 1, y: 4 },
      { x: 2, y: 4 }
    ];

    for (const method of ['minmax', 'snv'] as const) {
      expect(normalise(flat, method, OPTIONS)).toEqual({
        isOk: false,
        reason: 'flat'
      });
    }
  });
});
