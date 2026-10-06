import { describe, expect, it } from 'vitest';

import {
  detectHeaderRow,
  guessKind,
  splitHeaderUnit,
  suggestMapping,
  suggestPrefix
} from './layout';
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

describe('suggestMapping', () => {
  const headers = [
    'Sample',
    'Date',
    'Plasma power (W)',
    'Thickness (nm)',
    'Notes',
    'Sample',
    ''
  ];
  const columns = [{ id: 'power', name: 'plasma power' }];

  it('maps the well-known fields by name, the first match only', () => {
    const mapping = suggestMapping(headers, columns, []);

    expect(mapping[0]).toEqual({ type: 'code' });
    expect(mapping[1]).toEqual({ type: 'date' });
    expect(mapping[4]).toEqual({ type: 'note' });
    expect(mapping[5]).toMatchObject({ type: 'newColumn', name: 'Sample' });
  });

  it('reuses an existing column with the same name, ignoring case and unit', () => {
    expect(suggestMapping(headers, columns, [])[2]).toEqual({
      type: 'column',
      columnId: 'power'
    });
  });

  it('suggests a new parameter column with its unit and a guessed type', () => {
    const mapping = suggestMapping(
      ['Thickness (nm)'],
      [],
      [[number(40), number(43)]]
    );

    expect(mapping[0]).toEqual({
      type: 'newColumn',
      name: 'Thickness',
      unit: 'nm',
      kind: 'number',
      role: 'parameter'
    });
  });

  it('ignores a column with no header', () => {
    expect(suggestMapping(headers, columns, [])[6]).toEqual({ type: 'ignore' });
  });
});

describe('suggestPrefix', () => {
  it('suggests the letters most codes start with', () => {
    expect(suggestPrefix(['ALD001', 'ALD002', 'ald003', 'PSL001'])).toBe('ALD');
  });

  it('suggests nothing for codes with no clear prefix', () => {
    expect(suggestPrefix(['001', '002'])).toBe('');
    expect(suggestPrefix(['A1', 'A2'])).toBe('');
  });
});
