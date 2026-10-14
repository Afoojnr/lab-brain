import * as XLSX from 'xlsx';

import type { EdxItem } from '../techniques/edx/from-files';
import { DEFAULT_EDX_VALUE_IDS, edxValues } from '../techniques/edx/stats';
import type { SeqfitItem } from '../techniques/ellipsometry/from-files';
import { ellipsometryValues } from '../techniques/ellipsometry/parse';
import { processSpectrum } from '../techniques/ftir/process';
import { strongestNear } from '../techniques/ftir/transform';
import type { FtirSettings, SpectrumPoint } from '../techniques/ftir/types';
import { ftirUnit, peakLabel } from '../techniques/ftir/values';

export type SummaryTable = { headers: string[]; rows: (string | number)[][] };

/** Per-item choices for the EDX summary: the ratio pair, and the spots left out of each item. */
export type EdxSummarySettings = {
  numerator: string;
  denominator: string;
  excludedSpots: Record<string, string[]>;
};

/**
 * The EDX summary as the lab notebook's `EDS_summary.xlsx`: one row per sample
 * with the ratio, B, N, C, O and the substrate, each with its std. A sample
 * whose spots are all left out has empty cells, never zeros. (The ratio of an
 * element that is not there is 0, as in the notebook.)
 */
export const edxSummary = (
  items: EdxItem[],
  settings: EdxSummarySettings
): SummaryTable => {
  const columns = edxValues(
    [],
    settings.numerator,
    settings.denominator
  ).filter(value => DEFAULT_EDX_VALUE_IDS.includes(value.id));
  const order = DEFAULT_EDX_VALUE_IDS.filter(id =>
    columns.some(column => column.id === id)
  );

  return {
    headers: [
      'ID',
      ...order.map(id => columns.find(column => column.id === id)?.label ?? id)
    ],
    rows: items.map(item => {
      const included = item.spots.filter(
        spot => !(settings.excludedSpots[item.id] ?? []).includes(spot.id)
      );
      if (included.length === 0) return [item.id, ...order.map(() => '')];

      const values = edxValues(
        included,
        settings.numerator,
        settings.denominator
      );

      return [
        item.id,
        ...order.map(id => values.find(value => value.id === id)?.value ?? '')
      ];
    })
  };
};

/**
 * The ellipsometry summary: one row per readable fit export with the thickness
 * and n, each with its std, as the file's summary rows give them.
 */
export const ellipsometrySummary = (items: SeqfitItem[]): SummaryTable => ({
  headers: ['ID', 'Thickness (nm)', 'Thickness std (nm)', 'n', 'n std'],
  rows: items.flatMap(item =>
    item.summary
      ? [
          [
            item.id,
            ...ellipsometryValues(item.summary).map(value => value.value)
          ]
        ]
      : []
  )
});

/**
 * The FTIR summary: one row per spectrum with the value at each of the user's
 * peaks, read as processed (so a normalised table is relative). A peak with no
 * data near it is an empty cell, never 0.
 */
export const ftirSummary = (
  spectra: { id: string; points: SpectrumPoint[] }[],
  settings: FtirSettings
): SummaryTable => {
  const processed = spectra.map(spectrum => ({
    id: spectrum.id,
    spectrum: processSpectrum(spectrum.points, settings)
  }));
  const first = processed[0]?.spectrum;

  return {
    headers: [
      'ID',
      ...settings.peaks.map(peak => {
        const label = first ? peakLabel(peak, first) : String(peak.position);
        const unit = first ? ftirUnit(first) : null;

        return unit ? `${label} (${unit})` : label;
      })
    ],
    rows: processed.map(({ id, spectrum }) => [
      id,
      ...settings.peaks.map(
        peak =>
          strongestNear(
            spectrum.points,
            peak.position,
            settings.tolerance,
            spectrum.orientation
          )?.y ?? ''
      )
    ])
  };
};

/**
 * An Excel workbook (one sheet, headers then rows) as bytes, ready to download.
 */
export const buildWorkbook = (
  table: SummaryTable,
  sheetName: string
): Uint8Array => {
  const sheet = XLSX.utils.aoa_to_sheet([table.headers, ...table.rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));

  return new Uint8Array(
    XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  );
};
