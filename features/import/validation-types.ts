import type {
  ParameterDefinition,
  ParameterValues,
  Sample,
  Study
} from '@/features/experiments/shared';

/** What the import needs to know about the project's stored data. */
export type ValidationContext = {
  /** Prefixes of the project's experiments (a new experiment may not reuse one). */
  otherPrefixes: string[];
  /** The target experiment's columns; empty for a new experiment. */
  columns: ParameterDefinition[];
  /** The target experiment's studies; empty for a new experiment. */
  studies: Study[];
  /** The target experiment's samples; empty for a new experiment. */
  experimentSamples: Sample[];
  /** Codes of the project's samples that are not in the target experiment. */
  otherCodes: string[];
};

/** A problem on one cell (`column`) or on the row as a whole (null). Message is a key under `import.issues`. */
export type Issue = { column: number | null; message: string };

export type RowStatus = 'new' | 'conflict' | 'error' | 'empty';

/** What happens to the row when the import is applied. */
export type RowAction = 'create' | 'update' | 'skip';

export type RowReport = {
  sheetRow: number;
  code: string;
  status: RowStatus;
  issues: Issue[];
  action: RowAction;
  /** For a conflict, whether the existing sample is in the target experiment (so it can be updated). */
  canUpdate: boolean;
  /** For an update, how many values it changes. */
  changes: number;
};

/** One sample to write, with every value already checked and converted. */
export type PlannedSample = {
  sheetRow: number;
  mode: 'create' | 'update';
  /** The sample to change, for an update. */
  existingId?: string;
  code: string;
  performedOn: string | null;
  /** Keyed by column id, or `new:<source column index>` for a column the import creates. */
  values: ParameterValues;
  implementation: string | null;
  observation: string | null;
  note: string | null;
  /** Study names to add, spelled as the existing study when there is one. */
  studyNames: string[];
};

export type ImportCounts = {
  new: number;
  conflict: number;
  error: number;
  empty: number;
  skipped: number;
};

export type ImportReport = {
  /** Problems with the setup itself, as keys under `import.issues`. */
  setupIssues: string[];
  /** Problems with a new experiment's fields, as keys from the experiment form. */
  targetIssues: string[];
  /** Problems with a new column's name, unit or kind, by source column. */
  columnIssues: Issue[];
  /** Columns the import creates, with ids `new:<source column index>`. */
  newColumns: ParameterDefinition[];
  rows: RowReport[];
  planned: PlannedSample[];
  newStudyNames: string[];
  counts: ImportCounts;
  isReady: boolean;
};
