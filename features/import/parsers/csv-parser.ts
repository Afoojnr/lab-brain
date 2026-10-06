import Papa from 'papaparse';

import type { ImportParser, ParsedSheet, RawCell } from '../types';

/**
 * Reads a CSV file held as text. The delimiter (comma, semicolon, tab) is
 * detected, and every cell stays text: "1,5" is not turned into a number here,
 * because only the column it is mapped to knows whether it should be one.
 *
 * @param text - The file contents.
 * @param name - The sheet name to give it, normally the file name.
 */
export const parseCsvText = (text: string, name: string): ParsedSheet => {
  const content = text.replace(/^\uFEFF/, '');
  // The delimiter is guessed with blank lines skipped: a trailing newline would
  // otherwise make a ';' file with decimal commas look comma-separated. The
  // real parse keeps blank lines so row numbers match the spreadsheet's.
  const { delimiter } = Papa.parse(content, {
    skipEmptyLines: 'greedy'
  }).meta;
  const { data } = Papa.parse<string[]>(content, {
    delimiter,
    skipEmptyLines: false
  });
  const width = Math.max(0, ...data.map(row => row.length));
  const rows: RawCell[][] = data.map(row =>
    Array.from({ length: width }, (_, column): RawCell => {
      const value = (row[column] ?? '').trim();
      return value === '' ? { kind: 'empty' } : { kind: 'text', value };
    })
  );

  return { name, rows, comments: new Map<string, string>() };
};

export const csvParser: ImportParser = {
  accepts: file => file.name.toLowerCase().endsWith('.csv'),
  parse: async file => [
    parseCsvText(await file.text(), file.name.replace(/\.csv$/i, ''))
  ]
};
