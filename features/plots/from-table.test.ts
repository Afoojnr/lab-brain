import { describe, expect, it } from 'vitest';

import type { ParsedSheet, RawCell } from '@/lib/spreadsheet/types';

import { tableFromSheet } from './from-table';

const text = (value: string): RawCell => ({ kind: 'text', value });
const num = (value: number): RawCell => ({ kind: 'number', value });
const empty: RawCell = { kind: 'empty' };

const sheet = (rows: RawCell[][]): ParsedSheet => ({
  name: 'Sheet1',
  rows,
  comments: new Map()
});

describe('tableFromSheet', () => {
  const table = tableFromSheet(
    sheet([
      [text('Sample'), text('Power (W)'), text('Thickness (nm)'), text('Gas')],
      [text('A1'), num(100), text('12,5'), text('N2')],
      [empty, empty, empty, empty],
      [text('A2'), num(200), text('n/a'), text('Ar')],
      [text('A3'), num(300), empty, empty]
    ]),
    0
  );

  it('reads names and units from the header', () => {
    expect(table.columns.map(column => [column.name, column.unit])).toEqual([
      ['Sample', null],
      ['Power', 'W'],
      ['Thickness', 'nm'],
      ['Gas', null]
    ]);
  });

  it('marks a column of numbers (with blanks and markers) as number, others as text', () => {
    expect(table.columns.map(column => column.kind)).toEqual([
      'text',
      'number',
      'number',
      'text'
    ]);
  });

  it('skips blank rows and labels rows by the first text column', () => {
    expect(table.rows.map(row => row.label)).toEqual(['A1', 'A2', 'A3']);
  });

  it('reads a decimal comma and leaves markers and blanks out, never 0', () => {
    const [thickness] = table.columns.filter(
      column => column.name === 'Thickness'
    );

    expect(table.rows[0].values[thickness.key]).toBe(12.5);
    expect(thickness.key in table.rows[1].values).toBe(false);
    expect(thickness.key in table.rows[2].values).toBe(false);
  });

  it('treats a column with any real word as text so a word is never a number', () => {
    const result = tableFromSheet(
      sheet([[text('Mix')], [num(1)], [text('high')]]),
      0
    );

    expect(result.columns[0].kind).toBe('text');
  });
});
