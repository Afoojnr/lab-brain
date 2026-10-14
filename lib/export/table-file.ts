import {
  CSV_TYPE,
  downloadBytes,
  fileNameFor,
  XLSX_TYPE
} from '@/lib/download-file';

import type { ExportTable } from './types';

export type TableFormat = 'xlsx' | 'csv';

/**
 * Saves a table as an Excel or CSV file named after the title. A `null` cell
 * is left empty, never 0. The spreadsheet library is large, so it is only
 * downloaded when someone exports.
 *
 * @param format - Excel or CSV.
 * @param title - What the file is about; names the file and the sheet.
 * @param table - Headers and rows.
 */
export const exportTableFile = async (
  format: TableFormat,
  title: string,
  table: ExportTable
) => {
  const { tableToCsv, tableToWorkbook } = await import('./tabular');
  if (format === 'csv') {
    downloadBytes(fileNameFor(title, 'csv'), tableToCsv(table), CSV_TYPE);
    return;
  }

  downloadBytes(
    fileNameFor(title, 'xlsx'),
    tableToWorkbook(table, title),
    XLSX_TYPE
  );
};
