/** The kinds of analysis the app can run on a characterization's files. */
export type AnalysisKind = 'edx' | 'ellipsometry';

/**
 * One number an analysis produces, ready to be sent to a result column. It is
 * always computed from the raw files and the saved settings, never stored.
 */
export type AnalysisValue = {
  /** Stable key, e.g. `ratio`, `el:B`, `thickness:std`. */
  id: string;
  label: string;
  unit: string | null;
  value: number;
  /** Set when the value could not really be computed and is shown as 0 (a ratio with no denominator). */
  flag?: 'unavailable';
};

/** What the user chose for an analysis; saved with the characterization. */
export type AnalysisSettings = {
  /** EDX: the ratio's elements, e.g. B over N. */
  numerator: string;
  denominator: string;
  /** EDX: spots left out of the average (their files are untouched). */
  excludedSpots: string[];
  /** Ellipsometry: which attached CSV to read. */
  datasetId: string | null;
  /** The values to send to the result columns. */
  selectedValueIds: string[];
  /** Where each value goes: an existing result column's id, or a new column. */
  targets: Record<string, ColumnTarget>;
};

export type ColumnTarget =
  | { type: 'column'; columnId: string }
  | { type: 'new'; name: string; unit: string };

export type Analysis = {
  id: string;
  characterizationId: string;
  kind: AnalysisKind;
  settings: AnalysisSettings;
  updatedAt: Date;
};
