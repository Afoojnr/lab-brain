import { exportFigureFile } from '@/lib/export/figure-file';
import type { FigureFileInput } from '@/lib/export/figure-file';
import { exportTableFile } from '@/lib/export/table-file';
import type { ExportTable } from '@/lib/export/types';

export type ExportFormat = 'png' | 'pdf' | 'pptx' | 'xlsx' | 'csv';

export type ExportInput = FigureFileInput & {
  /** The plotted values, for the Excel and CSV formats. */
  table: ExportTable;
};

/**
 * Saves the plot as a file in the chosen format. The picture formats (PNG, PDF,
 * PowerPoint) use the light theme with the caption and legend, so a figure
 * explains itself; Excel and CSV hold the plotted values.
 *
 * @throws When the chart is not drawn, or the picture cannot be made.
 */
export const exportPlot = async (
  format: ExportFormat,
  { table, ...figure }: ExportInput
) => {
  if (format === 'xlsx' || format === 'csv') {
    await exportTableFile(format, figure.title, table);
    return;
  }

  await exportFigureFile(format, figure);
};
