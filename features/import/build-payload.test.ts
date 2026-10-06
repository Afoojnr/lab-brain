import { describe, expect, it } from 'vitest';

import { buildPayload, initialMapping } from './build-payload';
import type { ParsedSheet, RawCell } from './types';

const text = (value: string): RawCell => ({ kind: 'text', value });
const num = (value: number): RawCell => ({ kind: 'number', value });
const empty: RawCell = { kind: 'empty' };

const SHEET: ParsedSheet = {
  name: 'Deposition',
  rows: [
    [text('Deposition log'), empty, empty],
    [text('Sample'), text('Power (W)'), text('Date')],
    [empty, text('kW'), empty],
    [text('ALD001'), num(100), { kind: 'date', value: '2026-09-04' }],
    [empty, empty, empty],
    [text('ALD003'), text('1,5'), text('04/09/2026')]
  ],
  comments: new Map([['5:1', 'Re-measured']])
};

const build = (hasUnitsRow: boolean) =>
  buildPayload({
    sheet: SHEET,
    layout: { headerRow: 1, hasUnitsRow },
    target: { type: 'existing', experimentId: 'e1' },
    mapping: [],
    dateFormat: 'iso',
    choices: {},
    shouldSkipErrorRows: false
  });

describe('buildPayload', () => {
  it('starts after the header and units rows and keeps spreadsheet row numbers', () => {
    const payload = build(true);

    expect(payload.headers).toEqual(['Sample', 'Power (W)', 'Date']);
    expect(payload.rows.map(row => row.sheetRow)).toEqual([4, 5, 6]);
    expect(payload.rows[0]?.cells).toEqual(['ALD001', '100', '2026-09-04']);
  });

  it('keeps text exactly as written and puts comments on their column', () => {
    const payload = build(true);

    expect(payload.rows[2]?.cells).toEqual(['ALD003', '1,5', '04/09/2026']);
    expect(payload.rows[2]?.comments).toEqual({ '1': 'Re-measured' });
  });

  it('treats the units row as data when the sheet has none', () => {
    expect(build(false).rows[0]?.cells).toEqual(['', 'kW', '']);
  });
});

describe('initialMapping', () => {
  it('takes a unit from the units row over the one in the header', () => {
    const mapping = initialMapping(
      SHEET,
      { headerRow: 1, hasUnitsRow: true },
      []
    );

    expect(mapping[0]).toEqual({ type: 'code' });
    expect(mapping[1]).toMatchObject({
      type: 'newColumn',
      name: 'Power',
      unit: 'kW'
    });
    expect(mapping[2]).toEqual({ type: 'date' });
  });

  it('uses the unit in the header when there is no units row', () => {
    const mapping = initialMapping(
      SHEET,
      { headerRow: 1, hasUnitsRow: false },
      []
    );

    expect(mapping[1]).toMatchObject({ name: 'Power', unit: 'W' });
  });
});
