import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import type { ExportTable } from './types';

export type NamedTable = { name: string; table: ExportTable };

/** Several tables as one Excel file, one sheet each, in order. */
export const tablesToWorkbook = (sheets: NamedTable[]): Uint8Array => {
  const workbook = XLSX.utils.book_new();
  for (const { name, table } of sheets) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([table.headers, ...table.rows]),
      name.slice(0, 31)
    );
  }

  return new Uint8Array(
    XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  );
};

/** A table as an Excel file (one sheet). */
export const tableToWorkbook = (
  table: ExportTable,
  sheetName: string
): Uint8Array => tablesToWorkbook([{ name: sheetName, table }]);

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/**
 * A table as CSV text with a byte-order mark, so Excel reads accented letters
 * and symbols such as °C correctly.
 */
export const tableToCsv = (table: ExportTable): Uint8Array =>
  new TextEncoder().encode(
    `${BYTE_ORDER_MARK}${Papa.unparse({
      fields: table.headers,
      data: table.rows.map(row => row.map(cell => cell ?? ''))
    })}`
  );
