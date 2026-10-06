import {
  buildExperimentFormSchema,
  buildParameterFormSchema
} from '@/features/experiments/shared';
import type { ParameterDefinition } from '@/features/experiments/shared';

import type { ColumnTarget, ImportPayload, NewColumnTarget } from './types';
import type { Issue, ValidationContext } from './validation-types';

/** The key a source column's values are stored under: the column id, or `new:<index>`. */
export const columnKey = (
  target: ColumnTarget,
  index: number
): string | null =>
  target.type === 'column'
    ? target.columnId
    : target.type === 'newColumn'
      ? `new:${index}`
      : null;

/** Where each field of a sample comes from in the sheet (a source column index). */
export type FieldColumns = Partial<
  Record<
    'code' | 'date' | 'implementation' | 'observation' | 'note' | 'studies',
    number
  >
>;

export const findFieldColumns = (mapping: ColumnTarget[]): FieldColumns => {
  const fields: FieldColumns = {};
  for (const [index, target] of mapping.entries()) {
    if (
      target.type === 'code' ||
      target.type === 'date' ||
      target.type === 'implementation' ||
      target.type === 'observation' ||
      target.type === 'note' ||
      target.type === 'studies'
    ) {
      fields[target.type] ??= index;
    }
  }

  return fields;
};

/**
 * Checks the import's setup before any row: a code column is mapped, nothing
 * is mapped twice, the new experiment's fields are valid and every new column
 * has a usable name.
 *
 * @param payload - The import.
 * @param context - The project's stored data.
 * @returns The new columns as definitions (id `new:<index>`), and the problems found.
 */
export const checkSetup = (
  payload: ImportPayload,
  context: ValidationContext
) => {
  const setupIssues: string[] = [];
  const targetIssues: string[] = [];
  const columnIssues: Issue[] = [];

  const singles = payload.mapping.filter(target =>
    [
      'code',
      'date',
      'implementation',
      'observation',
      'note',
      'studies'
    ].includes(target.type)
  );
  if (!payload.mapping.some(target => target.type === 'code')) {
    setupIssues.push('codeNotMapped');
  }
  const columnIds = payload.mapping.flatMap(target =>
    target.type === 'column' ? [target.columnId] : []
  );
  const hasRepeatedTarget =
    new Set(singles.map(target => target.type)).size !== singles.length ||
    new Set(columnIds).size !== columnIds.length;
  if (hasRepeatedTarget) setupIssues.push('targetUsedTwice');
  if (columnIds.some(id => !context.columns.some(column => column.id === id))) {
    setupIssues.push('unknownColumn');
  }

  if (payload.target.type === 'new') {
    const parsed = buildExperimentFormSchema(context.otherPrefixes).safeParse(
      payload.target
    );
    if (!parsed.success) {
      targetIssues.push(...parsed.error.issues.map(issue => issue.message));
    }
  }

  const newColumns = checkNewColumns(payload, context, columnIssues);

  return { setupIssues, targetIssues, columnIssues, newColumns };
};

const checkNewColumns = (
  payload: ImportPayload,
  context: ValidationContext,
  columnIssues: Issue[]
): ParameterDefinition[] => {
  const names = context.columns.map(column => column.name);
  const definitions: ParameterDefinition[] = [];

  for (const [index, target] of payload.mapping.entries()) {
    if (target.type !== 'newColumn') continue;

    const parsed = buildParameterFormSchema(names).safeParse(
      toParameterForm(target)
    );
    if (parsed.success) {
      names.push(parsed.data.name);
      definitions.push({
        id: `new:${index}`,
        experimentId: '',
        name: parsed.data.name,
        unit: parsed.data.unit === '' ? null : parsed.data.unit,
        kind: parsed.data.kind,
        role: parsed.data.role,
        defaultValue: null,
        position: context.columns.length + definitions.length
      });
      continue;
    }
    for (const issue of parsed.error.issues) {
      columnIssues.push({ column: index, message: issue.message });
    }
  }

  return definitions;
};

const toParameterForm = (target: NewColumnTarget) => ({
  name: target.name,
  unit: target.unit,
  kind: target.kind,
  role: target.role,
  defaultValue: ''
});
