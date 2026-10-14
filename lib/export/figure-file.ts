import {
  downloadBytes,
  fileNameFor,
  PDF_TYPE,
  PNG_TYPE,
  PPTX_TYPE
} from '@/lib/download-file';

import { composeFigure } from './figure';
import type { FigureLegendItem } from './figure';
import { buildPdf } from './pdf';
import { buildPptx } from './pptx';
import { svgToPng } from './svg-image';

export type FigureFormat = 'png' | 'pdf' | 'pptx';

export type FigureFileInput = {
  /** The element holding the drawn chart. */
  chartElement: HTMLElement;
  title: string;
  /** Caption lines: source, settings, counts. */
  lines: string[];
  legend: FigureLegendItem[];
  /** What the legend's entries are (e.g. the column coloured by); omitted when not needed. */
  legendTitle?: string;
  /** Scales the title, caption and legend text (1 is normal). */
  textScale: number;
};

/** The bytes of a `data:` URL written in base64. */
export const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));

  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

/** The chart's SVG as markup with its size, or null when it is not drawn yet. */
export const readChartSvg = (container: HTMLElement) => {
  // A chart's legend icons are small `recharts-surface` SVGs of their own, so take the biggest one.
  const area = (svg: Element) => {
    const { width, height } = svg.getBoundingClientRect();

    return width * height;
  };
  const chart = [...container.querySelectorAll('svg.recharts-surface')].sort(
    (a, b) => area(b) - area(a)
  )[0];
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
 * Saves a drawn chart as a picture (PNG), a PDF or a PowerPoint slide. They use
 * the light theme with the caption and legend, so a figure explains itself; a
 * PDF page or a slide carries the title and caption itself.
 *
 * @throws When the chart is not drawn, or the picture cannot be made.
 */
export const exportFigureFile = async (
  format: FigureFormat,
  {
    chartElement,
    title,
    lines,
    legend,
    legendTitle,
    textScale
  }: FigureFileInput
) => {
  const chart = readChartSvg(chartElement);
  if (!chart) throw new Error('The chart is not drawn.');

  const isDocument = format === 'pdf' || format === 'pptx';
  const figure = composeFigure({
    chart,
    title: isDocument ? undefined : title,
    lines: isDocument ? [] : lines,
    legend,
    legendTitle,
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
