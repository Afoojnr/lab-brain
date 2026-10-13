import { parseDecimal } from '@/lib/numbers';

export type Size = 'small' | 'medium' | 'large';

/**
 * How the plot looks, as opposed to what it plots. Text boxes are kept as
 * typed: an empty title means "use the default", and a range bound that is
 * empty or not a number is left automatic (never 0).
 */
export type PlotStyle = {
  /** Axis ranges; empty means automatic. */
  xMin: string;
  xMax: string;
  yMin: string;
  yMax: string;
  /** Empty means the default, e.g. "Thickness (nm) vs Temperature (°C)". */
  title: string;
  xTitle: string;
  yTitle: string;
  textSize: Size;
  markerSize: Size;
  showGrid: boolean;
  /** Whether an exported figure says where the data is from. */
  showSource: boolean;
  /** Whether an exported figure says how many samples were plotted and left out. */
  showCounts: boolean;
};

export const DEFAULT_STYLE: PlotStyle = {
  xMin: '',
  xMax: '',
  yMin: '',
  yMax: '',
  title: '',
  xTitle: '',
  yTitle: '',
  textSize: 'medium',
  markerSize: 'medium',
  showGrid: true,
  showSource: false,
  showCounts: false
};

/** Font sizes in pixels for the chart's text, and the factor for the figure's title and caption. */
export const TEXT_SIZES: Record<
  Size,
  { tick: number; label: number; legend: number; scale: number }
> = {
  small: { tick: 10, label: 11, legend: 11, scale: 0.9 },
  medium: { tick: 12, label: 13, legend: 13, scale: 1 },
  large: { tick: 14, label: 16, legend: 16, scale: 1.25 }
};

/** Marker areas for the scatter symbols. */
export const MARKER_AREAS: Record<Size, number> = {
  small: 36,
  medium: 64,
  large: 121
};

/**
 * An axis' range from the two typed bounds. A bound that is empty or not a
 * number stays automatic; on a logarithmic axis a bound of 0 or less cannot be
 * drawn, so it stays automatic too; a range whose minimum is not below its
 * maximum is ignored.
 *
 * @param min - The typed minimum.
 * @param max - The typed maximum.
 * @param isLog - Whether the axis is logarithmic.
 */
export const axisDomain = (
  min: string,
  max: string,
  isLog: boolean
): [number | 'auto', number | 'auto'] => {
  const usable = (value: number | null) =>
    value === null || (isLog && value <= 0) ? null : value;
  const low = usable(parseDecimal(min));
  const high = usable(parseDecimal(max));
  if (low !== null && high !== null && low >= high) return ['auto', 'auto'];

  return [low ?? 'auto', high ?? 'auto'];
};
