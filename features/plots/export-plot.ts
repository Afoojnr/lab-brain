import {
  CSV_TYPE,
  downloadBytes,
  PDF_TYPE,
  PNG_TYPE,
  PPTX_TYPE,
  XLSX_TYPE
} from '@/lib/download-file';
import { buildPdf } from '@/lib/export/pdf';
import { buildPptx } from '@/lib/export/pptx';
import { svgToPng } from '@/lib/export/svg-image';
import { tableToCsv, tableToWorkbook } from '@/lib/export/tabular';
import type { ExportTable } from '@/lib/export/types';

import { composeFigure } from './export-figure';
import type { FigureLegendItem } from './export-figure';

export type ExportFormat = 'png' | 'pdf' | 'pptx' | 'xlsx' | 'csv';

export type ExportInput = {
  /** The element holding the drawn chart. */
  chartElement: HTMLElement;
  title: string;
  /** Caption lines: source, filters, counts. */
  lines: string[];
  legend: FigureLegendItem[];
  /** Scales the title, caption and legend text (1 is normal). */
  textScale: number;
  /** The plotted values, for the Excel and CSV formats. */
  table: ExportTable;
};

/** A file name from a title: lower case, letters and digits joined by dashes. */
export const fileNameFor = (title: string, extension: string) => {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return `${slug === '' ? 'plot' : slug}.${extension}`;
};

/** The bytes of a `data:` URL written in base64. */
export const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));

  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

/** The chart's SVG as markup with its size, or null when it is not drawn yet. */
export const readChartSvg = (container: HTMLElement) => {
  const chart = container.querySelector('svg.recharts-surface');
  if (!chart) return null;

  const box = chart.getBoundingClientRect();
  const width =
    box.width || Number.parseFloat(chart.getAttribute('width') ?? '');
  const height =
    box.height || Number.parseFloat(chart.getAttribute('height') ?? '');
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;

  const copy = chart.cloneNode(true) as SVGElement;
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  copy.setAttribute('viewBox', `0 0 ${width} ${height}`);
  copy.removeAttribute('style');
  copy.removeAttribute('class');
  copy.setAttribute('class', 'recharts-surface');

  return { svg: new XMLSerializer().serializeToString(copy), width, height };
};

/**
 * Saves the plot as a file in the chosen format. The picture formats (PNG, PDF, PowerPoint) use the light theme with the caption and legend, so a
 * figure explains itself; Excel and CSV hold the plotted values.
 *
 * @throws When the chart is not drawn, or the picture cannot be made.
 */
export const exportPlot = async (
  format: ExportFormat,
  { chartElement, title, lines, legend, textScale, table }: ExportInput
) => {
  if (format === 'xlsx') {
    downloadBytes(
      fileNameFor(title, 'xlsx'),
      tableToWorkbook(table, title),
      XLSX_TYPE
    );
    return;
  }
  if (format === 'csv') {
    downloadBytes(fileNameFor(title, 'csv'), tableToCsv(table), CSV_TYPE);
    return;
  }

  const chart = readChartSvg(chartElement);
  if (!chart) throw new Error('The chart is not drawn.');

  // A PDF page or a slide carries the title and the caption itself.
  const isDocument = format === 'pdf' || format === 'pptx';
  const figure = composeFigure({
    chart,
    title: isDocument ? undefined : title,
    lines: isDocument ? [] : lines,
    legend,
    textScale
  });

  const image = await svgToPng(figure.svg, figure.width, figure.height);
  if (format === 'png') {
    downloadBytes(
      fileNameFor(title, 'png'),
      dataUrlToBytes(image.dataUrl),
      PNG_TYPE
    );
    return;
  }

  const pages = [{ title, image, lines }];
  if (format === 'pdf') {
    downloadBytes(fileNameFor(title, 'pdf'), await buildPdf(pages), PDF_TYPE);
    return;
  }

  downloadBytes(fileNameFor(title, 'pptx'), await buildPptx(pages), PPTX_TYPE);
};
