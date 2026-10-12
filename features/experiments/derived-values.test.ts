import { describe, expect, it } from 'vitest';

import {
  calculateDerivedValues,
  calculateForSamples,
  compileDerived,
  dependentsOf,
  formulaColumns,
  referencedIds
} from './derived-values';

const entered = (id: string, name: string) => ({
  id,
  name,
  kind: 'number' as const
});
const DEFINITIONS = [entered('t', 'Thickness'), entered('c', 'Cycles')];
const calc = (id: string, name: string, formula: string) => ({
  id,
  name,
  formula
});
// GPC = Thickness * 10 / Cycles; GPCnm = GPC / 10; Double = GPCnm * 2.
const GPC = calc('gpc', 'GPC', '[#t] * 10 / [#c]');
const GPC_NM = calc('gpcnm', 'GPC nm', '[#gpc] / 10');
const DOUBLE = calc('dbl', 'Double', '[#gpcnm] * 2');

const run = (
  derived: ReturnType<typeof calc>[],
  values: Record<string, number | string>
) => calculateDerivedValues(compileDerived(DEFINITIONS, derived), values);

describe('referencedIds', () => {
  it('lists each column a stored formula uses, once', () => {
    expect(referencedIds('[#a] * [#b] + [#a]')).toEqual(['a', 'b']);
    expect(referencedIds('2 * 3')).toEqual([]);
  });
});

describe('calculateDerivedValues', () => {
  it('works out a column from another calculated column, and a third from that', () => {
    const result = run([GPC, GPC_NM, DOUBLE], { t: 40, c: 50 });

    expect(result.gpc).toBe(8);
    expect(result.gpcnm).toBeCloseTo(0.8, 10);
    expect(result.dbl).toBeCloseTo(1.6, 10);
  });

  it('does not depend on the order the columns are listed in', () => {
    const result = run([DOUBLE, GPC_NM, GPC], { t: 40, c: 50 });

    expect(result.gpc).toBe(8);
    expect(result.dbl).toBeCloseTo(1.6, 10);
  });

  it('is empty all the way down the chain when an input is missing, never 0', () => {
    const result = run([GPC, GPC_NM, DOUBLE], { t: 40 });

    expect(result).toEqual({ gpc: null, gpcnm: null, dbl: null });
  });

  it('is empty when a step divides by zero, and so is everything built on it', () => {
    const result = run([GPC, GPC_NM], { t: 40, c: 0 });

    expect(result).toEqual({ gpc: null, gpcnm: null });
  });

  it('keeps a recorded 0 as 0 through the chain', () => {
    const result = run([GPC, GPC_NM], { t: 0, c: 50 });

    expect(result).toEqual({ gpc: 0, gpcnm: 0 });
  });

  it('cannot work out columns that loop or use a loop: they are empty, and the others still work', () => {
    const loopA = calc('a', 'A', '[#b] + 1');
    const loopB = calc('b', 'B', '[#a] + 1');
    const self = calc('s', 'S', '[#s] + 1');
    const usesLoop = calc('u', 'U', '[#a] * 2');
    const result = run([GPC, loopA, loopB, self, usesLoop], { t: 40, c: 50 });

    expect(result).toMatchObject({
      gpc: 8,
      a: null,
      b: null,
      s: null,
      u: null
    });
  });

  it('is empty for a formula that names a column that no longer exists', () => {
    expect(run([calc('x', 'X', '[#gone] + 1')], { t: 1 })).toEqual({ x: null });
  });
});

describe('calculateForSamples', () => {
  it('gives each sample its own values', () => {
    const result = calculateForSamples(
      DEFINITIONS,
      [GPC, GPC_NM],
      [
        { id: 's1', values: { t: 40, c: 50 } },
        { id: 's2', values: { t: 20 } }
      ]
    );

    expect(result.s1.gpc).toBe(8);
    expect(result.s2).toEqual({ gpc: null, gpcnm: null });
  });
});

describe('dependentsOf', () => {
  it('finds the columns that use a column, directly or through others', () => {
    expect(dependentsOf([GPC, GPC_NM, DOUBLE], 'gpc').map(c => c.id)).toEqual([
      'gpcnm',
      'dbl'
    ]);
    expect(dependentsOf([GPC, GPC_NM, DOUBLE], 'dbl')).toEqual([]);
    expect(dependentsOf([GPC, GPC_NM, DOUBLE], 't').map(c => c.id)).toEqual([
      'gpc',
      'gpcnm',
      'dbl'
    ]);
  });
});

describe('formulaColumns', () => {
  it('offers entered and all calculated columns when adding one', () => {
    expect(
      formulaColumns(DEFINITIONS, [GPC, GPC_NM]).map(column => column.id)
    ).toEqual(['t', 'c', 'gpc', 'gpcnm']);
  });

  it('leaves out the column being edited and the ones that use it', () => {
    expect(
      formulaColumns(DEFINITIONS, [GPC, GPC_NM, DOUBLE], 'gpcnm').map(
        column => column.id
      )
    ).toEqual(['t', 'c', 'gpc']);
  });
});
