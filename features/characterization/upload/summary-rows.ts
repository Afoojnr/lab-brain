import * as XLSX from 'xlsx';

import type { EdxItem } from '../techniques/edx/from-files';
import { DEFAULT_EDX_VALUE_IDS, edxValues } from '../techniques/edx/stats';
import type { SeqfitItem } from '../techniques/ellipsometry/from-files';
import { ellipsometryValues } from '../techniques/ellipsometry/parse';

export type SummaryTable = { headers: string[]; rows: (string | number)[][] };

/** Per-item choices for the EDX summary: the ratio pair, and the spots left out of each item. */
export type EdxSummarySettings = {
  numerator: string;
  denominator: string;
  excludedSpots: Record<string, string[]>;
};

/**
 * The EDX summary as the lab notebook's `EDS_summary.xlsx`: one row per
 * sample with the ratio, B, N, C, O and the substrate, each with its std. A
 * sample whose spots are all left out has empty cells, never zeros (the
 * ratio of an element that is not there is 0, as in the notebook, because it
 * is then plotted).
 *
 * @param items - The samples.
 * @param settings - The ratio pair and the spots left out.
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
 *
 * @param items - The dropped fit exports.
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
 * An Excel workbook (one sheet, headers then rows) as bytes, ready to download.
 *
 * @param table - The summary.
 * @param sheetName - The sheet's name.
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
