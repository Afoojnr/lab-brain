import type {
  Characterization,
  DerivedColumn,
  Experiment,
  ParameterDefinition,
  ParameterValue,
  Sample,
  Study
} from '@/features/experiments/shared';

/** The most rows (or snippets) any one tool answer returns, so a question never costs a whole table. */
export const MAX_TOOL_ROWS = 50;
export const DEFAULT_TOOL_ROWS = 20;
/** How much text of a long note or protocol one answer carries. */
const MAX_TEXT_CHARS = 600;

export type Source = { label: string; path: string };

/** Everything the tools know about one experiment, loaded once per question. */
export type ExperimentData = {
  experiment: Experiment;
  definitions: ParameterDefinition[];
  derivedColumns: DerivedColumn[];
  studies: Study[];
  samples: Sample[];
  characterizations: Characterization[];
  /** Calculated values: sample id → column id → value (null where it cannot be worked out). */
  derivedValues: Record<string, Record<string, number | null>>;
};

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'missing'
  | 'present';

export type SampleFilterInput = {
  column: string;
  operator: FilterOperator;
  value?: string | number;
};

export type SampleSortInput = { column: string; direction: 'asc' | 'desc' };

export type QueryError = { error: string; availableColumns?: string[] };

type ColumnRef = {
  id: string;
  name: string;
  unit: string | null;
  kind: 'number' | 'text';
  role: 'parameter' | 'result' | 'calculated';
};

const normalize = (text: string) => text.trim().toLowerCase();

/** Cut long text with an ellipsis so one note cannot flood the answer. */
export const clip = (text: string, max = MAX_TEXT_CHARS): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

export const experimentPath = (projectId: string, experimentId: string) =>
  `/projects/${projectId}/experiments/${experimentId}`;

export const samplePath = (
  projectId: string,
  experimentId: string,
  sampleId: string
) => `${experimentPath(projectId, experimentId)}/samples/${sampleId}`;

export const experimentSource = (
  projectId: string,
  experiment: Pick<Experiment, 'id' | 'name'>
): Source => ({
  label: experiment.name,
  path: experimentPath(projectId, experiment.id)
});

export const sampleSource = (
  projectId: string,
  sample: Pick<Sample, 'id' | 'code' | 'experimentId'>
): Source => ({
  label: sample.code,
  path: samplePath(projectId, sample.experimentId, sample.id)
});

/** The columns a question can name: entered ones, then calculated ones. */
export const columnsOf = (data: ExperimentData): ColumnRef[] => [
  ...data.definitions.map((column): ColumnRef => ({
    id: column.id,
    name: column.name,
    unit: column.unit,
    kind: column.kind,
    role: column.role
  })),
  ...data.derivedColumns.map((column): ColumnRef => ({
    id: column.id,
    name: column.name,
    unit: column.unit,
    kind: 'number',
    role: 'calculated'
  }))
];

const findColumn = (data: ExperimentData, name: string) =>
  columnsOf(data).find(column => normalize(column.name) === normalize(name));

/**
 * One sample's value in a column: the entered value, the calculated value, or
 * null when it was not recorded (never 0).
 */
export const valueOf = (
  data: ExperimentData,
  sample: Sample,
  column: ColumnRef
): ParameterValue | null =>
  column.role === 'calculated'
    ? (data.derivedValues[sample.id]?.[column.id] ?? null)
    : (sample.values[column.id] ?? null);

const unknownColumn = (data: ExperimentData, name: string): QueryError => ({
  error: `No column named "${name}" in ${data.experiment.name}.`,
  availableColumns: columnsOf(data).map(column => column.name)
});

const matches = (
  value: ParameterValue | null,
  { operator, value: wanted }: SampleFilterInput,
  column: ColumnRef
): boolean => {
  if (operator === 'missing') return value === null;
  if (operator === 'present') return value !== null;
  if (value === null || wanted === undefined) return false;
  if (operator === 'contains')
    return String(value).toLowerCase().includes(String(wanted).toLowerCase());

  if (column.kind === 'number') {
    const left = Number(value);
    const right = Number(wanted);
    switch (operator) {
      case 'eq':
        return left === right;
      case 'neq':
        return left !== right;
      case 'gt':
        return left > right;
      case 'gte':
        return left >= right;
      case 'lt':
        return left < right;
      case 'lte':
        return left <= right;
    }
  }
  const left = String(value).toLowerCase();
  const right = String(wanted).toLowerCase();
  if (operator === 'eq') return left === right;
  if (operator === 'neq') return left !== right;

  return false;
};

const COMPARISONS: FilterOperator[] = ['gt', 'gte', 'lt', 'lte'];

const compareValues = (a: ParameterValue, b: ParameterValue) =>
  typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a).localeCompare(String(b), undefined, { numeric: true });

const nameOf = (data: ExperimentData, studyId: string) =>
  data.studies.find(study => study.id === studyId)?.name ?? studyId;

/** One row of values by column name; a column with no value is null. */
const rowOf = (
  data: ExperimentData,
  sample: Sample,
  columns: ColumnRef[]
): Record<string, ParameterValue | null> =>
  Object.fromEntries(
    columns.map(column => [column.name, valueOf(data, sample, column)])
  );

/**
 * Samples of one experiment that match filters, sorted and capped. A sample
 * with no value for a filtered column never matches a comparison, and sorts last.
 */
export const findSamples = (
  data: ExperimentData,
  input: {
    filters?: SampleFilterInput[];
    study?: string;
    codeContains?: string;
    sort?: SampleSortInput;
    columns?: string[];
    limit?: number;
  }
) => {
  const filters = input.filters ?? [];
  const resolved: { filter: SampleFilterInput; column: ColumnRef }[] = [];
  for (const filter of filters) {
    const column = findColumn(data, filter.column);
    if (!column) return unknownColumn(data, filter.column);
    if (filter.operator !== 'missing' && filter.operator !== 'present') {
      if (filter.value === undefined)
        return { error: `The filter on "${column.name}" needs a value.` };
      if (
        column.kind === 'number' &&
        filter.operator !== 'contains' &&
        !Number.isFinite(Number(filter.value))
      )
        return {
          error: `"${column.name}" is a number column; "${filter.value}" is not a number.`
        };
      if (column.kind === 'text' && COMPARISONS.includes(filter.operator))
        return {
          error: `"${column.name}" is a text column; use eq, neq or contains.`
        };
    }
    resolved.push({ filter, column });
  }

  let study: Study | undefined;
  if (input.study) {
    study = data.studies.find(
      item => normalize(item.name) === normalize(input.study as string)
    );
    if (!study)
      return {
        error: `No study named "${input.study}" in ${data.experiment.name}.`,
        availableColumns: data.studies.map(item => item.name)
      };
  }

  const shown: ColumnRef[] = [];
  for (const name of input.columns ?? []) {
    const column = findColumn(data, name);
    if (!column) return unknownColumn(data, name);
    shown.push(column);
  }
  const sortColumn = input.sort ? findColumn(data, input.sort.column) : null;
  if (input.sort && !sortColumn) return unknownColumn(data, input.sort.column);

  const needle = input.codeContains ? normalize(input.codeContains) : '';
  let found = data.samples.filter(
    sample =>
      (!study || sample.studyIds.includes(study.id)) &&
      (needle === '' || sample.code.toLowerCase().includes(needle)) &&
      resolved.every(({ filter, column }) =>
        matches(valueOf(data, sample, column), filter, column)
      )
  );

  if (sortColumn && input.sort) {
    const sign = input.sort.direction === 'desc' ? -1 : 1;
    found = [...found].sort((a, b) => {
      const left = valueOf(data, a, sortColumn);
      const right = valueOf(data, b, sortColumn);
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;

      return sign * compareValues(left, right);
    });
  }

  const limit = Math.min(
    Math.max(Math.trunc(input.limit ?? DEFAULT_TOOL_ROWS), 1),
    MAX_TOOL_ROWS
  );
  const rows = found.slice(0, limit);
  // The columns a question filters or sorts on are always shown with the sample.
  const columns = [
    ...new Map(
      [
        ...resolved.map(item => item.column),
        ...(sortColumn ? [sortColumn] : []),
        ...shown
      ].map(column => [column.id, column])
    ).values()
  ];

  return {
    experiment: data.experiment.name,
    totalMatches: found.length,
    returned: rows.length,
    isTruncated: found.length > rows.length,
    units: Object.fromEntries(
      columns
        .filter(column => column.unit)
        .map(column => [column.name, column.unit])
    ),
    samples: rows.map(sample => ({
      code: sample.code,
      values: rowOf(data, sample, columns),
      studies: sample.studyIds.map(id => nameOf(data, id))
    })),
    sources: rows.map(sample => sampleSource(data.experiment.projectId, sample))
  };
};

/**
 * Everything recorded about one sample, by code: every column with its unit
 * (null when not recorded), the notes, studies and measurements.
 */
export const getSample = (data: ExperimentData, code: string) => {
  const sample = data.samples.find(
    item => normalize(item.code) === normalize(code)
  );
  if (!sample)
    return {
      error: `No sample "${code}" in ${data.experiment.name}.`
    };

  return {
    experiment: data.experiment.name,
    code: sample.code,
    performedOn: sample.performedOn,
    columns: columnsOf(data).map(column => ({
      name: column.name,
      kind: column.role,
      unit: column.unit,
      value: valueOf(data, sample, column)
    })),
    implementation: sample.implementation && clip(sample.implementation),
    observation: sample.observation && clip(sample.observation),
    note: sample.note && clip(sample.note),
    studies: sample.studyIds.map(id => nameOf(data, id)),
    measurements: data.characterizations
      .filter(item => item.sampleId === sample.id)
      .map(item => ({
        technique: item.technique,
        measuredOn: item.measuredOn,
        note: item.note && clip(item.note)
      })),
    sources: [sampleSource(data.experiment.projectId, sample)]
  };
};

/**
 * Search the free text people wrote: sample implementation, observation and
 * note, and the experiment's protocol. Returns short snippets, never whole notes.
 */
export const searchNotes = (
  data: ExperimentData,
  query: string,
  limit = DEFAULT_TOOL_ROWS
) => {
  const needle = normalize(query);
  if (needle === '') return { error: 'The search text is empty.' };

  const cap = Math.min(Math.max(Math.trunc(limit), 1), MAX_TOOL_ROWS);
  const snippet = (text: string) => {
    const at = text.toLowerCase().indexOf(needle);
    const start = Math.max(at - 120, 0);

    return clip(text.slice(start), 300);
  };
  const hits: { where: string; field: string; text: string; source: Source }[] =
    [];

  if (data.experiment.protocol?.toLowerCase().includes(needle))
    hits.push({
      where: `${data.experiment.name} protocol`,
      field: 'protocol',
      text: snippet(data.experiment.protocol),
      source: experimentSource(data.experiment.projectId, data.experiment)
    });
  for (const sample of data.samples) {
    for (const field of ['implementation', 'observation', 'note'] as const) {
      const text = sample[field];
      if (text?.toLowerCase().includes(needle))
        hits.push({
          where: sample.code,
          field,
          text: snippet(text),
          source: sampleSource(data.experiment.projectId, sample)
        });
    }
  }

  return {
    experiment: data.experiment.name,
    totalMatches: hits.length,
    isTruncated: hits.length > cap,
    matches: hits.slice(0, cap)
  };
};
