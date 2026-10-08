import Papa from 'papaparse';

import type { AnalysisValue } from '../../types';

export type SeqfitSummary = {
  thickness: { mean: number; std: number };
  n: { mean: number; std: number };
  /** The fitted points, for a chart. */
  points: { label: string; thickness: number; n: number }[];
};

/** An attached CSV and what was read from it (null when it is not a fit export). */
export type SeqfitFile = {
  datasetId: string;
  label: string;
  summary: SeqfitSummary | null;
};

export type SeqfitResult =
  | { isOk: true; summary: SeqfitSummary }
  | { isOk: false; reason: 'notSeqfit' | 'invalidNumber' };

const clean = (cell: string | undefined) => (cell ?? '').trim();

/** A cell as a number; an empty or non-numeric cell is NaN, never 0. */
const toNumber = (cell: string | undefined): number =>
  clean(cell) === '' ? Number.NaN : Number(cell);

/**
 * Reads an ellipsometer fit export (`*_seqfit.csv`): the thickness and n
 * from the `Average` and `StdDeviation` rows of its first summary block, found
 * by the column headers `d(nm)` and `n`, never by position. The numbers are the
 * file's own (rounded as the instrument software wrote them).
 *
 * @param text - The file's contents.
 */
export const parseSeqfit = (text: string): SeqfitResult => {
  const rows = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: false
  }).data.map(row => row.map(cell => clean(cell)));

  // The first summary block starts at the first header row with `d(nm)` and `n`
  // whose first cell is empty (the fitted-points table's header has a name there).
  const headerIndex = rows.findIndex(
    row => row[0] === '' && row.includes('d(nm)') && row.includes('n')
  );
  const header = rows[headerIndex];
  if (!header) return { isOk: false, reason: 'notSeqfit' };
  const thicknessColumn = header.indexOf('d(nm)');
  const nColumn = header.indexOf('n');

  let average: string[] | undefined;
  let deviation: string[] | undefined;
  for (const row of rows.slice(headerIndex + 1)) {
    if (row.every(cell => cell === '')) break;
    if (row[0]?.toLowerCase() === 'average') average = row;
    if (row[0]?.toLowerCase() === 'stddeviation') deviation = row;
  }
  if (!average || !deviation) return { isOk: false, reason: 'notSeqfit' };

  const numbers = [
    toNumber(average[thicknessColumn]),
    toNumber(deviation[thicknessColumn]),
    toNumber(average[nColumn]),
    toNumber(deviation[nColumn])
  ];
  if (numbers.some(value => !Number.isFinite(value))) {
    return { isOk: false, reason: 'invalidNumber' };
  }

  // The fitted points: rows of the first table (header has `Phase No.`), up to its first blank row.
  const pointsHeader = rows.findIndex(
    row => row[0] === 'Phase No.' && row.includes('d(nm)')
  );
  const pointColumns = rows[pointsHeader];
  const points: SeqfitSummary['points'] = [];
  if (pointColumns) {
    const dColumn = pointColumns.indexOf('d(nm)');
    const nPointColumn = pointColumns.indexOf('n');
    const labelColumn = pointColumns.indexOf('Measurement');
    for (const row of rows.slice(pointsHeader + 1)) {
      if (row.every(cell => cell === '')) break;
      const thickness = toNumber(row[dColumn]);
      const n = toNumber(row[nPointColumn]);
      if (Number.isFinite(thickness) && Number.isFinite(n)) {
        points.push({
          label: row[labelColumn] ?? `#${points.length + 1}`,
          thickness,
          n
        });
      }
    }
  }

  return {
    isOk: true,
    summary: {
      thickness: { mean: numbers[0] ?? 0, std: numbers[1] ?? 0 },
      n: { mean: numbers[2] ?? 0, std: numbers[3] ?? 0 },
      points
    }
  };
};

/** The ids ticked by default for ellipsometry. */
export const DEFAULT_ELLIPSOMETRY_VALUE_IDS = [
  'thickness',
  'thickness:std',
  'n',
  'n:std'
];

/** Every number an ellipsometry fit can send to the result columns. */
export const ellipsometryValues = (summary: SeqfitSummary): AnalysisValue[] => [
  {
    id: 'thickness',
    label: 'Thickness',
    unit: 'nm',
    value: summary.thickness.mean
  },
  {
    id: 'thickness:std',
    label: 'Thickness std',
    unit: 'nm',
    value: summary.thickness.std
  },
  { id: 'n', label: 'n', unit: null, value: summary.n.mean },
  { id: 'n:std', label: 'n std', unit: null, value: summary.n.std }
];
