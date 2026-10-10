import type { SeriesShape } from './series-style';

/** What the CSS variables of the chart are on paper: always the light theme, whatever the screen shows. */
const PAPER_COLORS: Record<string, string> = {
  '--plot-1': '#2a78d6',
  '--plot-2': '#eb6834',
  '--plot-3': '#1baf7a',
  '--muted-foreground': '#52514e',
  '--border': '#d9d9d6',
  '--background': '#ffffff',
  '--foreground': '#141414'
};
const INK = '#141414';
const SECONDARY_INK = '#52514e';
const PADDING = 24;
const FONT = 'Arial, Helvetica, sans-serif';

/**
 * Replaces each `var(--name)` with the light-theme colour, so the SVG stands
 * alone (a picture file has no page styles to look the variables up in).
 */
export const resolveCssVariables = (svg: string): string =>
  svg.replace(
    /var\((--[a-z0-9-]+)\)/gi,
    (_match, name: string) => PAPER_COLORS[name] ?? INK
  );

const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Breaks text into lines of at most `maxCharacters`, at spaces where it can. */
export const wrapText = (text: string, maxCharacters: number): string[] => {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (current !== '' && `${current} ${word}`.length > maxCharacters) {
      lines.push(current);
      current = word;
    } else {
      current = current === '' ? word : `${current} ${word}`;
    }
  }
  if (current !== '') lines.push(current);

  return lines;
};

const markerMarkup = (
  shape: SeriesShape,
  x: number,
  y: number,
  color: string
) => {
  const r = 5;
  switch (shape) {
    case 'square':
      return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" fill="${color}"/>`;
    case 'triangle':
      return `<polygon points="${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}" fill="${color}"/>`;
    case 'diamond':
      return `<polygon points="${x},${y - r - 1} ${x + r + 1},${y} ${x},${y + r + 1} ${x - r - 1},${y}" fill="${color}"/>`;
    case 'star': {
      const points = Array.from({ length: 10 }, (_, index) => {
        const radius = index % 2 === 0 ? r + 1 : (r + 1) / 2.4;
        const angle = (Math.PI / 5) * index - Math.PI / 2;
        return `${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`;
      });
      return `<polygon points="${points.join(' ')}" fill="${color}"/>`;
    }
    default:
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
  }
};

export type FigureLegendItem = {
  label: string;
  color: string;
  shape: SeriesShape;
};

type FigureInput = {
  /** The chart's own SVG markup, with its size in pixels. */
  chart: { svg: string; width: number; height: number };
  /** Drawn above the chart; leave out when a page or slide carries the title. */
  title?: string;
  /** Lines under the title: where the data is from, filters, counts. */
  lines?: string[];
  /** One entry per group; drawn only when there are two or more. */
  legend?: FigureLegendItem[];
  /** Scales the title, caption and legend text; 1 is normal. */
  textScale?: number;
};

/**
 * One self-contained picture of a plot: white background, an optional title
 * and caption lines, the legend, then the chart. Pure text in, text out, so
 * the plot picture, a PDF or a slide, and later a project report all share it.
 *
 * @returns The SVG markup and its size in CSS pixels.
 */
export const composeFigure = ({
  chart,
  title,
  lines = [],
  legend = [],
  textScale = 1
}: FigureInput): { svg: string; width: number; height: number } => {
  const width = chart.width + 2 * PADDING;
  const inner = width - 2 * PADDING;
  const parts: string[] = [];
  let y = PADDING;

  if (title) {
    for (const line of wrapText(
      title,
      Math.floor(inner / (10.5 * textScale))
    )) {
      y += 24 * textScale;
      parts.push(
        `<text x="${PADDING}" y="${y}" font-size="${20 * textScale}" font-weight="bold" fill="${INK}">${escapeXml(line)}</text>`
      );
    }
    y += 4;
  }
  for (const text of lines) {
    for (const line of wrapText(text, Math.floor(inner / (6.6 * textScale)))) {
      y += 18 * textScale;
      parts.push(
        `<text x="${PADDING}" y="${y}" font-size="${13 * textScale}" fill="${SECONDARY_INK}">${escapeXml(line)}</text>`
      );
    }
  }
  if (title || lines.length > 0) y += 12;

  if (legend.length > 1) {
    let x = PADDING;
    y += 12;
    for (const item of legend) {
      const itemWidth = 24 + item.label.length * 7.2 * textScale + 20;
      if (x > PADDING && x + itemWidth > width - PADDING) {
        x = PADDING;
        y += 20 * textScale;
      }
      parts.push(
        markerMarkup(item.shape, x + 6, y, item.color),
        `<text x="${x + 18}" y="${y + 4}" font-size="${13 * textScale}" fill="${INK}">${escapeXml(item.label)}</text>`
      );
      x += itemWidth;
    }
    y += 16;
  }

  const chartMarkup = chart.svg.replace('<svg', `<svg x="${PADDING}" y="${y}"`);
  y += chart.height + PADDING;

  const svg = resolveCssVariables(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" viewBox="0 0 ${width} ${y}" font-family="${FONT}"><rect width="${width}" height="${y}" fill="#ffffff"/>${parts.join('')}${chartMarkup}</svg>`
  );

  return { svg, width, height: y };
};
