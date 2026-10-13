import { describe, expect, it } from 'vitest';

import type { RawCell } from '@/lib/spreadsheet/types';

import { suggestMapping, suggestPrefix } from './layout';

const text = (value: string): RawCell => ({ kind: 'text', value });
const number = (value: number): RawCell => ({ kind: 'number', value });
const empty: RawCell = { kind: 'empty' };

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
