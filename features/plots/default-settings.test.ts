import { describe, expect, it } from 'vitest';

import { defaultSettings } from './default-settings';
import type { PlotColumn } from './types';

const column = (
  key: string,
  kind: PlotColumn['kind'],
  role?: PlotColumn['role']
): PlotColumn => ({ key, name: key, unit: null, kind, role });

describe('defaultSettings', () => {
  it('puts the first two number columns on X and Y, skipping text', () => {
    const settings = defaultSettings([
      column('a', 'text'),
      column('b', 'number'),
      column('c', 'number'),
      column('d', 'number')
    ]);

    expect(settings).toMatchObject({ x: 'b', y: 'c', error: null });
    expect(settings?.group).toEqual({ type: 'none' });
  });

  it('puts the first result on Y and the first parameter on X for an experiment', () => {
    const settings = defaultSettings([
      column('t', 'number', 'parameter'),
      column('cycles', 'number', 'parameter'),
      column('thickness', 'number', 'result'),
      column('gpc', 'number', 'calculated')
    ]);

    expect(settings).toMatchObject({ x: 't', y: 'thickness' });
  });

  it('never puts the same column on both axes', () => {
    const settings = defaultSettings([
      column('thickness', 'number', 'result'),
      column('t', 'number', 'parameter')
    ]);

    expect(settings).toMatchObject({ x: 't', y: 'thickness' });
    expect(
      defaultSettings([
        column('a', 'number', 'result'),
        column('b', 'number', 'result')
      ])
    ).toMatchObject({ x: 'b', y: 'a' });
  });

  it('is null when there are fewer than two number columns', () => {
    expect(defaultSettings([column('a', 'number'), column('b', 'text')])).toBe(
      null
    );
  });
});
