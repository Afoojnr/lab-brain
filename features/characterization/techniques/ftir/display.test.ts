import { describe, expect, it } from 'vitest';

import { forChart, nearestPoint } from './display';

describe('forChart', () => {
  it('returns a short spectrum untouched', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ];

    expect(forChart(points, 100)).toBe(points);
  });

  it('keeps a one-point dip that keeping every nth point would lose', () => {
    const points = Array.from({ length: 1000 }, (_, i) => ({
      x: i,
      y: i === 501 ? 1 : 80
    }));
    const drawn = forChart(points, 100);

    expect(drawn.length).toBeLessThanOrEqual(110);
    expect(drawn.some(point => point.y === 1)).toBe(true);
    expect(drawn.map(point => point.x)).toEqual(
      [...drawn.map(point => point.x)].sort((a, b) => a - b)
    );
  });
});

describe('nearestPoint', () => {
  const points = [
    { x: 600, y: 1 },
    { x: 604, y: 2 },
    { x: 610, y: 3 }
  ];

  it('finds the closest point, at either end too', () => {
    expect(nearestPoint(points, 603)).toEqual({ x: 604, y: 2 });
    expect(nearestPoint(points, 601)).toEqual({ x: 600, y: 1 });
    expect(nearestPoint(points, 100)).toEqual({ x: 600, y: 1 });
    expect(nearestPoint(points, 9000)).toEqual({ x: 610, y: 3 });
    expect(nearestPoint([], 5)).toBeNull();
  });
});
