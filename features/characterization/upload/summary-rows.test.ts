import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import type { EdxItem } from '../techniques/edx/from-files';
import { readSeqfitItems } from '../techniques/ellipsometry/from-files';
import { defaultFtirSettings } from '../techniques/ftir/defaults';
import { syntheticSpectrum } from '../techniques/ftir/synthetic';
import {
  buildWorkbook,
  edxSummary,
  ellipsometrySummary,
  ftirSummary
} from './summary-rows';

const spot = (id: string, atomic: Record<string, number>) => ({
  id,
  label: id,
  atomic,
  spectrum: null
});

// Fake numbers worked out by hand: B 50/40/60, N 30 each (percent).
const ITEM: EdxItem = {
  id: 'ABC130',
  problems: [],
  spots: [
    spot('s1', { B: 0.5, N: 0.3 }),
    spot('s2', { B: 0.4, N: 0.3 }),
    spot('s3', { B: 0.6, N: 0.3 })
  ]
};
const SETTINGS = { numerator: 'B', denominator: 'N', excludedSpots: {} };

describe('edxSummary', () => {
  it("has the notebook's columns: ratio, B, N, C, O and the substrate, each with its std", () => {
    expect(edxSummary([ITEM], SETTINGS).headers).toEqual([
      'ID',
      'B/N',
      'B/N std',
      'B',
      'B std',
      'N',
      'N std',
      'C',
      'C std',
      'O',
      'O std',
      'Substrate',
      'Substrate std'
    ]);
  });

  it('gives one row per sample with the averaged values', () => {
    const [row] = edxSummary([ITEM], SETTINGS).rows;

    expect(row?.[0]).toBe('ABC130');
    expect(row?.[1]).toBeCloseTo(50 / 30, 10);
    expect(row?.[3]).toBeCloseTo(50, 10);
    // C and O are not in the spots: 0, as in the notebook.
    expect(row?.slice(7, 11)).toEqual([0, 0, 0, 0]);
  });

  it('follows the ratio pair and leaves out the spots that were unticked', () => {
    const table = edxSummary([ITEM], {
      numerator: 'N',
      denominator: 'B',
      excludedSpots: { ABC130: ['s2'] }
    });

    expect(table.headers.slice(1, 3)).toEqual(['N/B', 'N/B std']);
    expect(table.rows[0]?.[1]).toBeCloseTo(30 / 55, 10);
  });

  it('gives empty cells, not zeros, for a sample whose spots are all left out', () => {
    const table = edxSummary([ITEM], {
      ...SETTINGS,
      excludedSpots: { ABC130: ['s1', 's2', 's3'] }
    });

    expect(table.rows[0]?.slice(1).every(cell => cell === '')).toBe(true);
  });
});

describe('ellipsometrySummary', () => {
  const SEQFIT = `Phase No.,Phase Desc,SubLay No.,Site No.,X,Y,Z,d(nm),d 2s(nm),n,k,R2,RMSE,Date&Time,Measurement
1,Dispersionlaws,0,,0,0,9.0,10.0,0.5,1.5,0,0.8,2.4,'2026/01/01 10:00:00',FAKE001_pt1
,,,,,,,,,,,,,,
,,,,,,,d(nm),d 2s(nm),n,k,,,,
Average,,,,,,,11.0,0.6,1.6,0,,,,
StdDeviation,,,,,,,1.0,0.07,0.1,0,,,,
`;

  it('has thickness and n with their stds, one row per readable file', () => {
    const items = readSeqfitItems([
      { path: 'FAKE001_seqfit.csv', text: SEQFIT },
      { path: 'broken.csv', text: 'a,b' }
    ]);
    const table = ellipsometrySummary(items);

    expect(table.headers).toEqual([
      'ID',
      'Thickness (nm)',
      'Thickness std (nm)',
      'n',
      'n std'
    ]);
    expect(table.rows).toEqual([['FAKE001', 11, 1, 1.6, 0.1]]);
  });
});

describe('buildWorkbook', () => {
  it('writes the headers and rows into one Excel sheet that reads back the same', () => {
    const bytes = buildWorkbook(
      { headers: ['ID', 'B/N'], rows: [['ABC130', 1.5]] },
      'EDX'
    );
    const workbook = XLSX.read(bytes, { type: 'array' });

    expect(workbook.SheetNames).toEqual(['EDX']);
    expect(
      XLSX.utils.sheet_to_json(workbook.Sheets.EDX!, { header: 1 })
    ).toEqual([
      ['ID', 'B/N'],
      ['ABC130', 1.5]
    ]);
  });
});

describe('ftirSummary', () => {
  const spectra = [
    {
      id: 'a.csv',
      points: syntheticSpectrum({
        bands: [{ at: 1100, depth: 40, width: 25 }],
        noise: 0
      })
    },
    {
      id: 'b.csv',
      points: syntheticSpectrum({
        bands: [{ at: 1100, depth: 20, width: 25 }],
        from: 1500,
        to: 4000,
        noise: 0
      })
    }
  ];

  it('has one row per spectrum with the value at each peak, empty where there is no data', () => {
    const table = ftirSummary(spectra, {
      ...defaultFtirSettings(),
      peaks: [{ id: 'p', position: 1100, label: 'B–C' }]
    });

    expect(table.headers).toEqual(['ID', '1100 cm⁻¹ — B–C (%)']);
    expect(table.rows[0][0]).toBe('a.csv');
    expect(table.rows[0][1]).toBeCloseTo(40, 0);
    // The second spectrum starts at 1500: nothing was measured near 1100.
    expect(table.rows[1]).toEqual(['b.csv', '']);
  });
});
