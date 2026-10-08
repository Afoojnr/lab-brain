import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/** The first rows of a table, for a quick look. */
export type TablePreview = {
  /** Sheet name (Excel) or null (CSV). */
  name: string | null;
  rows: string[][];
  /** All rows in the sheet, even the ones not shown. */
  totalRows: number;
};

export const PREVIEW_ROWS = 200;

const clip = (rows: string[][]) => rows.slice(0, PREVIEW_ROWS);

/**
 * Reads a CSV for display: the delimiter is guessed, every cell stays text.
 *
 * @param text - The file's contents.
 */
export const previewCsv = (text: string): TablePreview => {
  const rows = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy'
  }).data;

  return { name: null, rows: clip(rows), totalRows: rows.length };
};

/**
 * Reads every sheet of a workbook for display, with numbers and dates as
 * Excel shows them.
 *
 * @param data - The workbook's bytes.
 */
export const previewWorkbook = (data: ArrayBuffer): TablePreview[] => {
  const workbook = XLSX.read(data, { type: 'array' });

  return workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const rows = sheet
      ? XLSX.utils
          .sheet_to_json<unknown[]>(sheet, {
            header: 1,
            raw: false,
            blankrows: false
          })
          .map(row => row.map(cell => (cell == null ? '' : String(cell))))
      : [];

    return { name, rows: clip(rows), totalRows: rows.length };
  });
};

export const TEXT_PREVIEW_LINES = 300;

/**
 * The first lines of a text file, and how many there are in all.
 *
 * @param text - The file's contents.
 */
export const previewText = (text: string) => {
  const lines = text.split(/\r?\n/);

  return {
    text: lines.slice(0, TEXT_PREVIEW_LINES).join('\n'),
    totalLines: lines.length
  };
};
