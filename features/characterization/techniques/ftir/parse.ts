import type { SpectrumPoint } from './types';

/** The fewest points that make a spectrum worth reading. */
export const MIN_SPECTRUM_POINTS = 10;

export type SpectrumResult =
  | { isOk: true; points: SpectrumPoint[]; hasHeader: boolean }
  | {
      isOk: false;
      reason: 'empty' | 'invalidLine' | 'tooFewPoints';
      /** The 1-based line of the file that could not be read. */
      line?: number;
    };

type Separator = ';' | '\t' | ',' | ' ';

const NUMBER = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)([eE][+-]?\d+)?$/;

const splitLine = (line: string, separator: Separator): string[] =>
  (separator === ' ' ? line.trim().split(/\s+/) : line.split(separator)).map(
    cell => cell.trim()
  );

/**
 * The separator a file uses, from its first lines: a semicolon, a tab, a comma
 * or spaces.
 */
const detectSeparator = (lines: string[]): Separator => {
  const sample = lines.slice(0, 5);
  if (sample.some(line => line.includes(';'))) return ';';
  if (sample.some(line => line.includes('\t'))) return '\t';
  if (sample.some(line => splitLine(line, ',').length >= 2)) return ',';

  return ' ';
};

/** A cell as a number: a decimal comma is accepted unless commas separate columns; anything else is NaN, never 0. */
const toNumber = (cell: string, separator: Separator): number => {
  if (!NUMBER.test(cell)) return Number.NaN;
  const text = separator === ',' ? cell : cell.replace(',', '.');

  return Number(text);
};

/** The text without a leading byte order mark (some programs write one). */
const withoutBom = (text: string): string =>
  text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

/**
 * Reads an FTIR export: two columns (wavenumber, then the measured value), with
 * or without one header row, separated by a semicolon, tab, comma or spaces, with
 * a decimal point or comma. Further columns are ignored. A line that is not two
 * numbers is an error with its line number, never NaN and never 0.
 */
export const parseSpectrum = (text: string): SpectrumResult => {
  const lines = withoutBom(text)
    .split(/\r\n|\r|\n/)
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter(item => item.raw !== '');
  if (lines.length === 0) return { isOk: false, reason: 'empty' };

  const separator = detectSeparator(lines.map(item => item.raw));
  const points: SpectrumPoint[] = [];
  let hasHeader = false;

  for (const [index, { raw, line }] of lines.entries()) {
    const cells = splitLine(raw, separator);
    const x = toNumber(cells[0] ?? '', separator);
    const y = toNumber(cells[1] ?? '', separator);

    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y });
      continue;
    }
    // Only the first line may be a header (text for both columns).
    const isHeader =
      index === 0 &&
      cells.length >= 2 &&
      Number.isNaN(x) &&
      Number.isNaN(y) &&
      lines.length > 1;
    if (isHeader) {
      hasHeader = true;
      continue;
    }

    return { isOk: false, reason: 'invalidLine', line };
  }

  if (points.length < MIN_SPECTRUM_POINTS) {
    return { isOk: false, reason: 'tooFewPoints' };
  }

  return {
    isOk: true,
    points: points.sort((a, b) => a.x - b.x),
    hasHeader
  };
};
