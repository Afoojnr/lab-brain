import { exportFigureFile } from '@/lib/export/figure-file';
import type { FigureFileInput } from '@/lib/export/figure-file';
import { exportTableFile } from '@/lib/export/table-file';
import type { ExportTable } from '@/lib/export/types';

export type FtirExportFormat = 'png' | 'pdf' | 'pptx' | 'xlsx' | 'csv';

export type FtirExportInput = Omit<FigureFileInput, 'textScale'> & {
  /** The value at each peak for each spectrum, for the Excel and CSV formats. */
  table: ExportTable;
};

/**
 * Saves the FTIR chart as a picture, a PDF or a PowerPoint slide (light theme,
 * with the title, a caption of how the spectra were read and processed, and the
 * legend), or the value at each peak as Excel or CSV.
 *
 * @throws When the chart is not drawn, or the picture cannot be made.
 */
export const exportFtir = async (
  format: FtirExportFormat,
  { table, ...figure }: FtirExportInput
) => {
  if (format === 'xlsx' || format === 'csv') {
    await exportTableFile(format, figure.title, table);
    return;
  }

  await exportFigureFile(format, { ...figure, textScale: 1 });
};
