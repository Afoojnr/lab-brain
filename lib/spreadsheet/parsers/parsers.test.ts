import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import { parseCsvText } from './csv-parser';
import { parseExcelBuffer } from './excel-parser';
import { MAX_FILE_BYTES, MAX_ROWS } from '../limits';
import { parseSpreadsheet } from './index';

// Fake data only: a small workbook is built here, never read from disk.
const workbookWith = (build: (sheet: XLSX.WorkSheet) => void) => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Sample', 'Date', 'Power (W)', 'Notes'],
    ['ALD001', null, 100, 'first'],
    ['ALD002', null, '', 'second'],
    ['ALD003', null, 120, null]
  ]);
  build(sheet);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Deposition');
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([['Pressure'], [1]]),
    'Paschen law'
  );
  return XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx'
  }) as ArrayBuffer;
};

describe('parseExcelBuffer', () => {
  it('reads every sheet with its name', () => {
    const sheets = parseExcelBuffer(workbookWith(() => undefined));

    expect(sheets.map(sheet => sheet.name)).toEqual([
      'Deposition',
      'Paschen law'
    ]);
  });

  it('keeps numbers as numbers and an empty cell as empty, never zero', () => {
    const [sheet] = parseExcelBuffer(workbookWith(() => undefined));

    expect(sheet?.rows[1]?.[2]).toEqual({ kind: 'number', value: 100 });
    expect(sheet?.rows[2]?.[2]).toEqual({ kind: 'empty' });
    expect(sheet?.rows[3]?.[3]).toEqual({ kind: 'empty' });
  });

  it('reads a date cell as its calendar date, with no time zone shift', () => {
    const buffer = workbookWith(sheet => {
      sheet['B2'] = { t: 'n', v: 46269, z: 'yyyy-mm-dd' };
      sheet['B3'] = { t: 'n', v: 46269, z: 'dd/mm/yyyy' };
    });
    const [sheet] = parseExcelBuffer(buffer);

    expect(sheet?.rows[1]?.[1]).toEqual({ kind: 'date', value: '2026-09-04' });
    expect(sheet?.rows[2]?.[1]).toEqual({ kind: 'date', value: '2026-09-04' });
  });

  it('reads a formula as the value Excel last calculated', () => {
    const buffer = workbookWith(sheet => {
      sheet['C2'] = { t: 'n', v: 150, f: 'C4+30' };
    });
    const [sheet] = parseExcelBuffer(buffer);

    expect(sheet?.rows[1]?.[2]).toEqual({ kind: 'number', value: 150 });
  });

  it('collects cell comments by row and column', () => {
    const buffer = workbookWith(sheet => {
      sheet['C3'] = {
        t: 'n',
        v: 110,
        c: [{ a: 'me', t: 'Changed after service' }]
      };
    });
    const [sheet] = parseExcelBuffer(buffer);

    expect(sheet?.comments.get('2:2')).toBe('Changed after service');
    expect(sheet?.comments.size).toBe(1);
  });

  it('keeps a merged cell value only in its first cell', () => {
    const buffer = workbookWith(sheet => {
      // Excel stores nothing in the cells a merge covers.
      delete sheet['D3'];
      sheet['!merges'] = [{ s: { r: 1, c: 3 }, e: { r: 2, c: 3 } }];
    });
    const [sheet] = parseExcelBuffer(buffer);

    expect(sheet?.rows[1]?.[3]).toEqual({ kind: 'text', value: 'first' });
    expect(sheet?.rows[2]?.[3]).toEqual({ kind: 'empty' });
  });
});

describe('parseCsvText', () => {
  it('detects a semicolon delimiter and keeps a decimal comma as text', () => {
    const sheet = parseCsvText('Sample;Power (W)\nALD001;1,5\nALD002;', 'file');

    expect(sheet.rows).toEqual([
      [
        { kind: 'text', value: 'Sample' },
        { kind: 'text', value: 'Power (W)' }
      ],
      [
        { kind: 'text', value: 'ALD001' },
        { kind: 'text', value: '1,5' }
      ],
      [{ kind: 'text', value: 'ALD002' }, { kind: 'empty' }]
    ]);
  });

  it('still detects the semicolon when the file ends with a newline', () => {
    // A trailing newline once made this look comma-separated and split "250,5".
    const sheet = parseCsvText(
      'Sample;Power (W)\nALD001;250,5\nALD003;300\n',
      'file'
    );

    expect(sheet.rows[0]).toHaveLength(2);
    expect(sheet.rows[1]?.[1]).toEqual({ kind: 'text', value: '250,5' });
  });

  it('handles quotes, a comma delimiter and a byte order mark', () => {
    const sheet = parseCsvText('﻿Sample,Note\nALD001,"a, b"', 'file');

    expect(sheet.rows[0]?.[0]).toEqual({ kind: 'text', value: 'Sample' });
    expect(sheet.rows[1]?.[1]).toEqual({ kind: 'text', value: 'a, b' });
  });

  it('keeps an empty line as a row of empty cells', () => {
    const sheet = parseCsvText('A,B\n\nC,D', 'file');

    expect(sheet.rows[1]).toEqual([{ kind: 'empty' }, { kind: 'empty' }]);
  });
});

describe('parseSpreadsheet', () => {
  it('rejects a file type it cannot read', async () => {
    const file = new File(['x'], 'data.pdf');

    expect(await parseSpreadsheet(file)).toEqual({
      isOk: false,
      failure: 'unsupportedType'
    });
  });

  it('rejects a file over the size limit', async () => {
    const file = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'big.csv');

    expect(await parseSpreadsheet(file)).toEqual({
      isOk: false,
      failure: 'tooLarge'
    });
  });

  it('rejects a sheet with too many rows', async () => {
    const file = new File(['a\n'.repeat(MAX_ROWS + 1)], 'long.csv');

    expect(await parseSpreadsheet(file)).toEqual({
      isOk: false,
      failure: 'tooManyRows'
    });
  });

  it('reads a CSV file into one sheet named after the file', async () => {
    const file = new File(['Sample,Date\nALD001,2026-09-04'], 'ald.csv');
    const result = await parseSpreadsheet(file);

    expect(result.isOk && result.sheets.map(sheet => sheet.name)).toEqual([
      'ald'
    ]);
  });

  it('reports a damaged workbook as unreadable instead of throwing', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'broken.xlsx');

    expect(await parseSpreadsheet(file)).toEqual({
      isOk: false,
      failure: 'unreadable'
    });
  });
});
