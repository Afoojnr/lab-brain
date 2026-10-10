import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import { tableToCsv, tableToWorkbook } from './tabular';

const TABLE = {
  headers: ['Sample', 'Temperature (°C)', 'Error'],
  rows: [
    ['ALD007', 150, 0.5],
    ['ALD008', 200, null]
  ]
};

describe('tableToWorkbook', () => {
  it('writes the headers and rows, leaving a null cell empty', () => {
    const workbook = XLSX.read(tableToWorkbook(TABLE, 'Plot'), {
      type: 'array'
    });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Plot, {
      header: 1
    });

    expect(rows[0]).toEqual(TABLE.headers);
    expect(rows[1]).toEqual(['ALD007', 150, 0.5]);
    expect(rows[2]).toEqual(['ALD008', 200]);
  });

  it('cuts a long sheet name to what Excel allows', () => {
    const workbook = XLSX.read(tableToWorkbook(TABLE, 'x'.repeat(50)), {
      type: 'array'
    });

    expect(workbook.SheetNames[0]).toHaveLength(31);
  });
});

describe('tableToCsv', () => {
  it('starts with a byte-order mark and writes an empty cell for null, not 0', () => {
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(
      tableToCsv(TABLE)
    );

    expect(text.startsWith('﻿')).toBe(true);
    expect(text).toContain('Sample,Temperature (°C),Error');
    expect(text).toContain('ALD008,200,');
    expect(text).not.toContain('ALD008,200,0');
  });
});
