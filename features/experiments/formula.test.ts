import { describe, expect, it } from 'vitest';

import {
  displayFormula,
  evaluateFormula,
  evaluateStored,
  parseFormula
} from './formula';

const COLUMNS = [
  { id: 'thickness', name: 'Thickness', kind: 'number' as const },
  { id: 'cycles', name: 'Cycles', kind: 'number' as const },
  { id: 'substrate', name: 'Substrate', kind: 'text' as const }
];

const calc = (text: string, values: Record<string, number | string>) => {
  const parsed = parseFormula(text, COLUMNS);
  return parsed.isOk ? evaluateFormula(parsed.ast, values) : 'parse error';
};

describe('parseFormula', () => {
  it('reads the GPC formula and stores columns by id', () => {
    const parsed = parseFormula('[Thickness] * 10 / [Cycles]', COLUMNS);

    expect(parsed).toMatchObject({
      isOk: true,
      stored: '[#thickness] * 10 / [#cycles]',
      columnIds: ['thickness', 'cycles']
    });
  });

  it('finds columns ignoring case and spaces, and accepts a stored formula', () => {
    expect(parseFormula('[ thickness ] + 1', COLUMNS).isOk).toBe(true);
    expect(parseFormula('[#thickness] + 1', COLUMNS).isOk).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['[Nope] * 2', 'unknownColumn'],
    ['[Substrate] * 2', 'notANumberColumn'],
    ['[Thickness] *', 'syntax'],
    ['* 2', 'syntax'],
    ['(1 + 2', 'syntax'],
    ['1 + 2)', 'syntax'],
    ['1 2', 'syntax'],
    ['[Thickness', 'syntax'],
    ['2 ^ 3', 'syntax'],
    ['Thickness * 2', 'syntax']
  ])('rejects %j as %s', (text, error) => {
    expect(parseFormula(text, COLUMNS)).toMatchObject({ isOk: false, error });
  });

  it('says where it went wrong and which column was meant', () => {
    expect(parseFormula('1 + [Nope]', COLUMNS)).toMatchObject({
      position: 4,
      name: 'Nope'
    });
    expect(parseFormula('1 + ', COLUMNS)).toMatchObject({ position: 4 });
  });

  it('never runs text as code', () => {
    expect(parseFormula('process.exit()', COLUMNS).isOk).toBe(false);
    expect(parseFormula('1; alert(1)', COLUMNS).isOk).toBe(false);
  });
});

describe('evaluateFormula', () => {
  it('computes GPC from thickness and cycles', () => {
    expect(
      calc('[Thickness] * 10 / [Cycles]', { thickness: 40.5, cycles: 50 })
    ).toBeCloseTo(8.1, 10);
  });

  it.each([
    ['1 + 2 * 3', 7],
    ['(1 + 2) * 3', 9],
    ['10 - 4 - 3', 3],
    ['2 * 3 / 4', 1.5],
    ['-2 * 3', -6],
    ['- (1 + 1)', -2],
    ['+3', 3],
    ['0,5 * 4', 2],
    ['.5 + .5', 1]
  ])('%s = %s', (text, expected) => {
    expect(calc(text, {})).toBeCloseTo(expected, 10);
  });

  it('is null, never 0 or NaN, when an input is not recorded', () => {
    expect(calc('[Thickness] * 10 / [Cycles]', { thickness: 40.5 })).toBeNull();
    expect(calc('[Thickness] * 10 / [Cycles]', { cycles: 50 })).toBeNull();
  });

  it('is null when it divides by 0 or overflows', () => {
    expect(
      calc('[Thickness] / [Cycles]', { thickness: 1, cycles: 0 })
    ).toBeNull();
    expect(calc('1 / (2 - 2)', {})).toBeNull();
    expect(calc('1e308 * 10', {})).toBe('parse error');
    expect(
      calc('[Thickness] * [Thickness] * [Thickness]', { thickness: 1e200 })
    ).toBeNull();
  });

  it('is null when a value that should be a number is text', () => {
    expect(calc('[Thickness] + 1', { thickness: 'thick' })).toBeNull();
  });

  it('keeps working after a column is renamed, because it is stored by id', () => {
    const parsed = parseFormula('[Thickness] * 2', COLUMNS);
    const stored = parsed.isOk ? parsed.stored : '';
    const renamed = COLUMNS.map(column =>
      column.id === 'thickness' ? { ...column, name: 'Film thickness' } : column
    );

    expect(evaluateStored(stored, renamed, { thickness: 5 })).toBe(10);
    expect(displayFormula(stored, renamed)).toBe('[Film thickness] * 2');
  });
});

describe('displayFormula', () => {
  it('shows the id of a column that no longer exists instead of failing', () => {
    expect(displayFormula('[#gone] * 2', COLUMNS)).toBe('[#gone] * 2');
  });
});
