import type { PlotStyle } from './style';

type CaptionParts = {
  /** Where the data is from, already written out; null when there is no source. */
  source: string | null;
  /** The active filters, already written out; null when there are none. */
  filters: string | null;
  /** How many were plotted and left out. */
  counts: string;
};

/**
 * The caption under an exported figure. The filters change what the figure
 * means, so they are always there (what the colours mean is the legend's title); where the data is from and
 * the working counts (plotted, unticked, left out) only when asked for in
 * Customise, since a figure for a paper or slide usually does not want them.
 */
export const captionLines = (
  parts: CaptionParts,
  style: Pick<PlotStyle, 'showSource' | 'showCounts'>
): string[] => [
  ...(style.showSource && parts.source ? [parts.source] : []),
  ...(parts.filters ? [parts.filters] : []),
  ...(style.showCounts ? [parts.counts] : [])
];
