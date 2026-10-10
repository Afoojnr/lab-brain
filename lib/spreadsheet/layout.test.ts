import { describe, expect, it } from 'vitest';

import { detectHeaderRow, guessKind, splitHeaderUnit } from './layout';
import type { RawCell } from './types';

const text = (value: string): RawCell => ({ kind: 'text', value });
const number = (value: number): RawCell => ({ kind: 'number', value });
const empty: RawCell = { kind: 'empty' };

describe('detectHeaderRow', () => {
  it('skips a title line above the table', () => {
    expect(
      detectHeaderRow([
        [text('ALD results 2026'), empty, empty],
        [text('Sample'), text('Power (W)'), text('Date')],
        [text('ALD001'), number(100), empty]
      ])
    ).toBe(1);
  });

  it('falls back to the first row when none looks like a header', () => {
    expect(detectHeaderRow([[number(1), number(2)]])).toBe(0);
  });
});

describe('splitHeaderUnit', () => {
  it.each([
    ['Plasma power (W)', { name: 'Plasma power', unit: 'W' }],
    ['Temperature [°C]', { name: 'Temperature', unit: '°C' }],
    ['Cycles', { name: 'Cycles', unit: '' }],
    ['(W)', { name: '(W)', unit: '' }]
  ])('splits %j', (header, expected) => {
    expect(splitHeaderUnit(header)).toEqual(expected);
  });
});

describe('guessKind', () => {
  it('suggests a number for numbers and numeric text, ignoring empty cells', () => {
    expect(guessKind([number(1), text('1,5'), empty])).toBe('number');
  });

  it('suggests text as soon as one cell is not a number', () => {
    expect(guessKind([number(1), text('Ar')])).toBe('text');
  });

  it('suggests text for a column with nothing in it, which accepts anything', () => {
    expect(guessKind([empty, empty])).toBe('text');
  });
});
