import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import {
  PREVIEW_ROWS,
  previewCsv,
  previewText,
  previewWorkbook,
  TEXT_PREVIEW_LINES
} from './parse-table';

describe('previewCsv', () => {
  it('guesses the delimiter and keeps cells as text', () => {
    const preview = previewCsv('Sample;Power (W)\nALD001;1,5\n');

    expect(preview.rows).toEqual([
      ['Sample', 'Power (W)'],
      ['ALD001', '1,5']
    ]);
  });

  it('shows the first rows and says how many there are', () => {
    const text = Array.from(
      { length: PREVIEW_ROWS + 50 },
      (_, i) => `r${i},x`
    ).join('\n');
    const preview = previewCsv(text);

    expect(preview.rows).toHaveLength(PREVIEW_ROWS);
    expect(preview.totalRows).toBe(PREVIEW_ROWS + 50);
  });
});

describe('previewWorkbook', () => {
  it('reads every sheet as text', () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['A', 'B'],
        [1, 2.5]
      ]),
      'First'
    );
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([['C']]),
      'Second'
    );
    const data = XLSX.write(book, {
      type: 'array',
      bookType: 'xlsx'
    }) as ArrayBuffer;

    const sheets = previewWorkbook(data);

    expect(sheets.map(sheet => sheet.name)).toEqual(['First', 'Second']);
    expect(sheets[0]?.rows).toEqual([
      ['A', 'B'],
      ['1', '2.5']
    ]);
  });
});

describe('previewText', () => {
  it('shows the first lines and counts them all', () => {
    const preview = previewText(
      Array.from({ length: TEXT_PREVIEW_LINES + 20 }, (_, i) => `l${i}`).join(
        '\n'
      )
    );

    expect(preview.text.split('\n')).toHaveLength(TEXT_PREVIEW_LINES);
    expect(preview.totalLines).toBe(TEXT_PREVIEW_LINES + 20);
  });
});
