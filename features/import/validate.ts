import {
  buildSampleFormSchema,
  buildStudyFormSchema,
  toSampleInput
} from '@/features/experiments/shared';
import type {
  ParameterDefinition,
  Sample
} from '@/features/experiments/shared';

import { normaliseDate } from './dates';
import type { ConflictChoice, ImportPayload, ImportRow } from './types';
import type {
  ImportCounts,
  ImportReport,
  Issue,
  PlannedSample,
  RowReport,
  ValidationContext
} from './validation-types';
import { checkSetup, columnKey, findFieldColumns } from './validate-setup';
import type { FieldColumns } from './validate-setup';

type RowContext = {
  payload: ImportPayload;
  context: ValidationContext;
  fields: FieldColumns;
  definitions: ParameterDefinition[];
  /** Lowercase code → how many rows in the file use it. */
  fileCodes: Map<string, number>;
};

const lower = (text: string) => text.trim().toLowerCase();

const textAt = (row: ImportRow, column: number | undefined): string =>
  column === undefined ? '' : (row.cells[column] ?? '').trim();

/** Comment lines `"<header>: <comment>"` for the row, in column order. */
const commentLines = (row: ImportRow, rowContext: RowContext): string[] =>
  Object.entries(row.comments)
    .map(([column, comment]) => [Number(column), comment.trim()] as const)
    .filter(
      ([column, comment]) =>
        comment !== '' && rowContext.payload.mapping[column]?.type !== 'ignore'
    )
    .sort((a, b) => a[0] - b[0])
    .map(
      ([column, comment]) =>
        `${rowContext.payload.headers[column]?.trim() ?? ''}: ${comment}`
    );

/** Study names of the row, split on `;`, spelled as an existing study when one matches. */
const studyNamesOf = (
  row: ImportRow,
  rowContext: RowContext
): { names: string[]; issues: Issue[] } => {
  const column = rowContext.fields.studies;
  const names: string[] = [];
  const issues: Issue[] = [];
  const known = rowContext.context.studies;

  for (const part of textAt(row, column).split(';')) {
    const name = part.trim();
    if (name === '' || names.some(other => lower(other) === lower(name))) {
      continue;
    }
    const existing = known.find(study => lower(study.name) === lower(name));
    if (
      !existing &&
      !buildStudyFormSchema([]).safeParse({ name, description: '' }).success
    ) {
      issues.push({ column: column ?? null, message: 'studyNameInvalid' });
      continue;
    }
    names.push(existing?.name ?? name);
  }

  return { names, issues };
};

/** The form values for the row: what the sample form would hold for this row. */
const formValuesOf = (
  row: ImportRow,
  rowContext: RowContext,
  code: string,
  note: string
) => {
  const values: Record<string, string> = {};
  for (const [index, target] of rowContext.payload.mapping.entries()) {
    const key = columnKey(target, index);
    if (key) values[key] = textAt(row, index);
  }

  return {
    code,
    performedOn: normaliseDate(
      textAt(row, rowContext.fields.date),
      rowContext.payload.dateFormat
    ),
    values,
    studyIds: [],
    implementation: textAt(row, rowContext.fields.implementation),
    observation: textAt(row, rowContext.fields.observation),
    note
  };
};

/** Where a schema issue belongs in the sheet. */
const columnOfIssue = (
  path: PropertyKey[],
  rowContext: RowContext
): number | null => {
  const [field, key] = path;
  if (field === 'values') {
    const index = rowContext.payload.mapping.findIndex(
      (target, position) => columnKey(target, position) === key
    );
    return index === -1 ? null : index;
  }
  const map: Record<string, number | undefined> = {
    code: rowContext.fields.code,
    performedOn: rowContext.fields.date,
    implementation: rowContext.fields.implementation,
    observation: rowContext.fields.observation,
    note: rowContext.fields.note
  };

  return typeof field === 'string' ? (map[field] ?? null) : null;
};

const joinNote = (existing: string | null, addition: string): string =>
  existing && addition ? `${existing}\n${addition}` : (existing ?? addition);

/** Final note for a row: its note cell, then its comment lines. */
const noteAddition = (row: ImportRow, rowContext: RowContext): string =>
  [textAt(row, rowContext.fields.note), ...commentLines(row, rowContext)]
    .filter(part => part !== '')
    .join('\n');

type Outcome = { report: RowReport; planned?: PlannedSample };

const checkRow = (
  row: ImportRow,
  rowContext: RowContext,
  choice: ConflictChoice | undefined,
  existing: Sample | undefined,
  isInOtherExperiment: boolean
): Outcome => {
  const { definitions, context } = rowContext;
  const cellCode = textAt(row, rowContext.fields.code);
  const isConflict = existing !== undefined || isInOtherExperiment;
  const mode =
    isConflict && choice?.action === 'update' && existing
      ? 'update'
      : isConflict && choice?.action === 'addAsNew'
        ? 'create'
        : isConflict
          ? 'skip'
          : 'create';

  const report: RowReport = {
    sheetRow: row.sheetRow,
    code: cellCode,
    status: isConflict ? 'conflict' : 'new',
    issues: [],
    action: mode,
    canUpdate: existing !== undefined,
    changes: 0
  };
  if (isConflict && choice?.action === 'update' && !existing) {
    report.issues.push({
      column: rowContext.fields.code ?? null,
      message: 'updateNotAllowed'
    });
  }
  if (mode === 'skip') return finish(report);

  const code = choice?.action === 'addAsNew' ? choice.code.trim() : cellCode;
  report.code = code;
  const note =
    mode === 'update'
      ? joinNote(existing?.note ?? null, noteAddition(row, rowContext))
      : noteAddition(row, rowContext);
  const otherCodes =
    choice?.action === 'addAsNew'
      ? [
          ...context.otherCodes,
          ...context.experimentSamples.map(sample => sample.code),
          ...[...rowContext.fileCodes.keys()].filter(
            key => key !== lower(cellCode)
          )
        ]
      : [];

  const parsed = buildSampleFormSchema(definitions, otherCodes).safeParse(
    formValuesOf(row, rowContext, code, note)
  );
  const studies = studyNamesOf(row, rowContext);
  report.issues.push(...studies.issues);
  if (!parsed.success) {
    report.issues.push(
      ...parsed.error.issues.map(issue => ({
        column: columnOfIssue(issue.path, rowContext),
        message: issue.message
      }))
    );
  }
  if (!parsed.success || report.issues.length > 0) return finish(report);

  const planned = planSample(
    row,
    rowContext,
    parsed.data,
    studies.names,
    mode === 'update' ? existing : undefined
  );
  report.changes = mode === 'update' ? countChanges(planned, existing) : 0;

  return finish(report, planned);
};

const finish = (report: RowReport, planned?: PlannedSample): Outcome => ({
  report: report.issues.length > 0 ? { ...report, status: 'error' } : report,
  planned: report.issues.length > 0 ? undefined : planned
});

const planSample = (
  row: ImportRow,
  rowContext: RowContext,
  data: Parameters<typeof toSampleInput>[2],
  studyNames: string[],
  existing: Sample | undefined
): PlannedSample => {
  const input = toSampleInput(rowContext.definitions, [], data);
  const hasCell = (column: number | undefined) => textAt(row, column) !== '';
  const fields = rowContext.fields;

  if (!existing) {
    return {
      sheetRow: row.sheetRow,
      mode: 'create',
      code: input.code,
      performedOn: input.performedOn,
      values: input.values,
      implementation: input.implementation,
      observation: input.observation,
      note: input.note,
      studyNames
    };
  }

  // An update only changes what the sheet filled in: an empty cell never erases.
  return {
    sheetRow: row.sheetRow,
    mode: 'update',
    existingId: existing.id,
    code: existing.code,
    performedOn: hasCell(fields.date)
      ? input.performedOn
      : existing.performedOn,
    values: { ...existing.values, ...input.values },
    implementation: hasCell(fields.implementation)
      ? input.implementation
      : existing.implementation,
    observation: hasCell(fields.observation)
      ? input.observation
      : existing.observation,
    note: input.note,
    studyNames
  };
};

const countChanges = (planned: PlannedSample, existing: Sample | undefined) => {
  if (!existing) return 0;
  const keys = Object.keys(planned.values);
  const changedValues = keys.filter(
    key => planned.values[key] !== existing.values[key]
  ).length;
  const changedFields = [
    planned.performedOn !== existing.performedOn,
    planned.implementation !== existing.implementation,
    planned.observation !== existing.observation,
    planned.note !== existing.note
  ].filter(Boolean).length;
  const addedStudies = planned.studyNames.length;

  return changedValues + changedFields + addedStudies;
};

/**
 * Checks a whole import without writing anything, and returns what would
 * happen to each row. The preview and the server both call this, so what the
 * user confirms is exactly what is checked again on the server.
 *
 * - A row's problems are reported on its exact cell.
 * - A code that already exists is a conflict: skipped unless the user chooses to update it
 *   (only inside the same experiment) or add it as new under another code.
 * - An update never erases: an empty cell leaves the stored value as it is.
 * - Cell comments become note lines `"<header>: <comment>"`.
 *
 * @param payload - The import.
 * @param context - The project's stored data.
 */
export const validateImport = (
  payload: ImportPayload,
  context: ValidationContext
): ImportReport => {
  const setup = checkSetup(payload, context);
  const definitions = [...context.columns, ...setup.newColumns];
  const fields = findFieldColumns(payload.mapping);
  const fileCodes = new Map<string, number>();
  for (const row of payload.rows) {
    const code = lower(textAt(row, fields.code));
    if (code) fileCodes.set(code, (fileCodes.get(code) ?? 0) + 1);
  }
  const rowContext: RowContext = {
    payload,
    context,
    fields,
    definitions,
    fileCodes
  };

  const rows: RowReport[] = [];
  const planned: PlannedSample[] = [];
  for (const row of payload.rows) {
    const outcome = checkOneRow(row, rowContext);
    rows.push(outcome.report);
    if (outcome.planned) planned.push(outcome.planned);
  }

  const counts = countRows(rows, payload.shouldSkipErrorRows);
  const hasSetupProblems =
    setup.setupIssues.length +
      setup.targetIssues.length +
      setup.columnIssues.length >
    0;

  return {
    setupIssues: setup.setupIssues,
    targetIssues: setup.targetIssues,
    columnIssues: setup.columnIssues,
    newColumns: setup.newColumns,
    rows,
    planned,
    newStudyNames: newStudyNames(planned, context),
    counts,
    isReady:
      !hasSetupProblems &&
      planned.length > 0 &&
      (counts.error === 0 || payload.shouldSkipErrorRows)
  };
};

const checkOneRow = (row: ImportRow, rowContext: RowContext): Outcome => {
  const { payload, context, fields } = rowContext;
  const blank: RowReport = {
    sheetRow: row.sheetRow,
    code: '',
    status: 'empty',
    issues: [],
    action: 'skip',
    canUpdate: false,
    changes: 0
  };
  if (
    row.cells.every(cell => cell.trim() === '') &&
    Object.keys(row.comments).length === 0
  ) {
    return { report: blank };
  }

  const code = textAt(row, fields.code);
  const choice = payload.choices[String(row.sheetRow)];
  const existing = context.experimentSamples.find(
    sample => lower(sample.code) === lower(code)
  );
  const isInOtherExperiment = context.otherCodes.some(
    other => lower(other) === lower(code)
  );

  if ((rowContext.fileCodes.get(lower(code)) ?? 0) > 1) {
    return {
      report: {
        ...blank,
        code,
        status: 'error',
        issues: [{ column: fields.code ?? null, message: 'duplicateInFile' }]
      }
    };
  }

  return checkRow(row, rowContext, choice, existing, isInOtherExperiment);
};

const countRows = (
  rows: RowReport[],
  shouldSkipErrorRows: boolean
): ImportCounts => {
  const count = (status: RowReport['status']) =>
    rows.filter(row => row.status === status).length;
  const skippedConflicts = rows.filter(
    row => row.status === 'conflict' && row.action === 'skip'
  ).length;

  return {
    new: count('new'),
    conflict: count('conflict'),
    error: count('error'),
    empty: count('empty'),
    skipped: skippedConflicts + (shouldSkipErrorRows ? count('error') : 0)
  };
};

const newStudyNames = (
  planned: PlannedSample[],
  context: ValidationContext
): string[] => {
  const names: string[] = [];
  for (const name of planned.flatMap(sample => sample.studyNames)) {
    const isKnown = [
      ...context.studies.map(study => study.name),
      ...names
    ].some(other => lower(other) === lower(name));
    if (!isKnown) names.push(name);
  }

  return names;
};
