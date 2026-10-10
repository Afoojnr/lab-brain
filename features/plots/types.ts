import type { PlotStyle } from './style';

/** One column that can be plotted or grouped by. */
export type PlotColumn = {
  /** Unique within the table; what rows are keyed by. */
  key: string;
  name: string;
  /** Null when it has no unit. */
  unit: string | null;
  kind: 'number' | 'text';
  /**
   * Where the column comes from in an experiment, to group the pickers: a
   * `parameter` (set), a `result` (measured) or a `calculated` column. Absent
   * for an uploaded table, whose columns have no such roles.
   */
  role?: 'parameter' | 'result' | 'calculated';
};

/** One point's source: a sample of an experiment, or a row of an uploaded table. */
export type PlotRow = {
  id: string;
  /** Shown in the tooltip: a sample code, or the row's first text. */
  label: string;
  /** Where clicking the point goes (a sample's page), or null. */
  href: string | null;
  /** A value by column key; a column with no value for the row is absent (never 0). */
  values: Record<string, number | string>;
  /** The studies the row is in; empty for an uploaded table. */
  groups: string[];
};

/** What the points are grouped (coloured) by. */
export type GroupBy =
  { type: 'none' } | { type: 'study' } | { type: 'column'; key: string };

export type PlotSettings = {
  x: string;
  y: string;
  /** A number column holding each point's error bar (e.g. a std), or null. */
  error: string | null;
  group: GroupBy;
  logX: boolean;
  logY: boolean;
};

export type PlotPoint = {
  x: number;
  y: number;
  /** Half the bar's height, above and below; absent when there is no error value. */
  error?: number;
  rowId: string;
  label: string;
  href: string | null;
};

export type PlotSeries = {
  key: string;
  /** The group's name; null for the groups the UI names itself (see `kind`). */
  name: string | null;
  /**
   * `all`: not grouped; `noStudy`/`noValue`: rows without a group; `group`: a
   * real group; `other`: the groups past the colours the chart can tell apart.
   */
  kind: 'all' | 'noStudy' | 'noValue' | 'group' | 'other';
  points: PlotPoint[];
};

/** Rows that could not be plotted, counted rather than hidden. */
export type LeftOut = {
  /** No number for X or Y. */
  missing: number;
  /** A value of 0 or less on a logarithmic axis. */
  notPositive: number;
};

/**
 * A rule that keeps only some rows. `values`: keep rows whose value is one of
 * these (nothing ticked = no restriction yet). `range`: keep rows whose number
 * is within the bounds; a bound left empty is open, and text that is not a
 * number is no bound at all (never 0). A row with no value for the column does
 * not pass an active filter.
 */
export type PlotFilter =
  | { type: 'values'; key: string; values: (number | string)[] }
  | { type: 'range'; key: string; min: string; max: string };

/**
 * A plot saved for an experiment: what to plot, not a picture. It is rebuilt
 * from the experiment's current samples whenever it is opened, so it follows
 * new samples. Only an experiment's plots are saved; an uploaded table is
 * never kept.
 */
export type SavedPlot = {
  id: string;
  experimentId: string;
  name: string;
  settings: PlotSettings;
  filters: PlotFilter[];
  /** Samples taken off the plot by unticking them. */
  untickedIds: string[];
  /** How it looks: ranges, titles, text size, ... */
  style: PlotStyle;
  createdAt: Date;
};

/** What the save action stores once validated: everything but the id and date. */
export type SavedPlotInput = Pick<
  SavedPlot,
  'name' | 'settings' | 'filters' | 'untickedIds' | 'style'
>;
