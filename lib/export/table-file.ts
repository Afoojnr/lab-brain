import {
  CSV_TYPE,
  downloadBytes,
  fileNameFor,
  XLSX_TYPE
} from '@/lib/export/download-file';

import type { ExportTable } from './types';

export type TableFormat = 'xlsx' | 'csv';

/**
 * Saves a table as an Excel or CSV file named after the title. A `null` cell is
 * left empty, never 0.
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
