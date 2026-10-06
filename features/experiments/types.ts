/**
 * A top-level container, e.g. "ALD of BxC". It holds experiment; each experiment has
 * its own columns and its own sample numbering. Shape mirrors the planned
 * database table so swapping demo data for Drizzle keeps this type.
 */
export type Project = {
  id: string;
  name: string;
  /** What the project is about; null when not set. */
  description: string | null;
  createdAt: Date;
};

/**
 * One kind of sample inside a project, like one sheet of a lab spreadsheet:
 * "Deposition" (prefix ALD) or "Paschen law" (prefix PSL). It owns its
 * columns (parameters) and its sample numbering (ALD001, ALD002, ...).
 */
export type Experiment = {
  id: string;
  projectId: string;
  name: string;
  /** Starts every sample code in the experiment, e.g. `ALD`. */
  codePrefix: string;
  /** The base method every sample in the experiment follows; null when not set. */
  protocol: string | null;
  createdAt: Date;
};

export type ParameterKind = 'number' | 'text';

/**
 * Whether a column is something you set (a `parameter`, e.g. a temperature) or
 * something you measured afterwards (a `result`, e.g. a thickness). Only the
 * grouping and prefill differ; both hold raw values with a unit.
 */
export type ParameterRole = 'parameter' | 'result';

/**
 * One column of an experiment (e.g. a temperature in °C). Columns can be added at
 * any time; samples recorded before it simply have no value for it. The unit
 * lives here, never inside a stored value.
 */
export type ParameterDefinition = {
  id: string;
  experimentId: string;
  name: string;
  /** Null when the parameter has no unit. */
  unit: string | null;
  kind: ParameterKind;
  role: ParameterRole;
  /**
   * Optional starting value. It prefills a new sample's form and is copied
   * into the sample when saved, so editing it later never changes recorded
   * samples. Always null for a result, which is never prefilled.
   */
  defaultValue: ParameterValue | null;
  /** Display order within the experiment. */
  position: number;
};

/** What the Add/Edit parameter form produces once validated and converted. */
export type ParameterInput = {
  name: string;
  /** Empty means no unit. */
  unit: string;
  kind: ParameterKind;
  role: ParameterRole;
  defaultValue: ParameterValue | null;
};

/** A raw, stored value: a number for `number` parameters, text otherwise. */
export type ParameterValue = number | string;

/** Values by parameter id. A missing key means "not recorded", never zero. */
export type ParameterValues = Record<string, ParameterValue>;

/**
 * A named study inside one experiment, such as "Plasma pulse study". It only
 * groups samples (a sample can belong to several, e.g. reused in a second
 * study or kept as a reference); it owns no columns.
 */
export type Study = {
  id: string;
  experimentId: string;
  name: string;
  /** Why the study exists; null when not set. */
  description: string | null;
  createdAt: Date;
};

/** One row of an experiment: a single sample and everything recorded about it. */
export type Sample = {
  id: string;
  experimentId: string;
  /** Typed by the user, e.g. `ALD023`; unique within the project. */
  code: string;
  /** Calendar date as `YYYY-MM-DD`, or null when not recorded. */
  performedOn: string | null;
  values: ParameterValues;
  /** Why the sample was made. */
  implementation: string | null;
  observation: string | null;
  /** One short comment on the whole sample, e.g. why a setting or column changed; null when none. */
  note: string | null;
  studyIds: string[];
  createdAt: Date;
};

/**
 * A measurement done on a sample (SEM, EDX, ellipsometry, ...), tracked by
 * technique and date. It only records that the measurement happened; the raw
 * files and results attach to it later. A technique can be recorded many times
 * on one sample.
 */
export type Characterization = {
  id: string;
  sampleId: string;
  /** Typed by the user; the app never assumes a list of techniques. */
  technique: string;
  /** Calendar date as `YYYY-MM-DD`, or null when not recorded. */
  measuredOn: string | null;
  note: string | null;
  createdAt: Date;
};
