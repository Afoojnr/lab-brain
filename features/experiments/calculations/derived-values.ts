import { evaluateFormula, parseFormula } from './formula';
import type { FormulaNode } from './formula';
import type {
  DerivedColumn,
  ParameterDefinition,
  ParameterValues,
  Sample
} from '../types';

/** What a formula may name: an entered number column or a calculated column. */
export type FormulaColumn = Pick<ParameterDefinition, 'id' | 'name' | 'kind'>;

type Calculated = Pick<DerivedColumn, 'id' | 'name' | 'formula'>;

const REFERENCE = /\[#([^\]]+)\]/g;

/** The ids of the columns a stored formula uses (it writes each as `[#id]`). */
export const referencedIds = (formula: string): string[] => [
  ...new Set(Array.from(formula.matchAll(REFERENCE), match => match[1]))
];

/**
 * The calculated columns that use a column, directly or through other
 * calculated columns. Changing or removing the column would break all of them.
 *
 * @param derived - The experiment's calculated columns.
 * @param id - A column's id (entered or calculated).
 */
export const dependentsOf = <T extends Calculated>(
  derived: T[],
  id: string
): T[] => {
  const found = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const column of derived) {
      if (
        !found.has(column.id) &&
        referencedIds(column.formula).includes(current)
      ) {
        found.add(column.id);
        queue.push(column.id);
      }
    }
  }

  return derived.filter(column => found.has(column.id));
};

const asNumberColumn = (column: Calculated): FormulaColumn => ({
  id: column.id,
  name: column.name,
  kind: 'number'
});

/**
 * The columns a calculated column's formula can use: every entered column and
 * every other calculated column, except (when editing) the column itself and
 * the ones that depend on it, since using those would make the formula loop
 * back to itself.
 *
 * @param definitions - The experiment's entered columns.
 * @param derived - Its calculated columns.
 * @param editingId - The calculated column being edited; omit when adding one.
 */
export const formulaColumns = (
  definitions: FormulaColumn[],
  derived: Calculated[],
  editingId?: string
): FormulaColumn[] => {
  const blocked = new Set(
    editingId
      ? [editingId, ...dependentsOf(derived, editingId).map(item => item.id)]
      : []
  );

  return [
    ...definitions,
    ...derived.filter(item => !blocked.has(item.id)).map(asNumberColumn)
  ];
};

/** A calculated column ready to evaluate: `ast` is null when it cannot be (a loop or an unreadable formula). */
export type CompiledDerived = { id: string; ast: FormulaNode | null };

/**
 * Reads every calculated column's formula once and puts the columns in the
 * order they can be worked out: a column comes after the calculated columns it
 * uses, whatever their positions. A column in a loop, or one that uses a loop,
 * cannot be calculated and gets no formula.
 *
 * @param definitions - The experiment's entered columns.
 * @param derived - Its calculated columns, in display order.
 */
export const compileDerived = (
  definitions: FormulaColumn[],
  derived: Calculated[]
): CompiledDerived[] => {
  const columns = [...definitions, ...derived.map(asNumberColumn)];
  const derivedIds = new Set(derived.map(item => item.id));
  const emitted = new Set<string>();
  const ordered: Calculated[] = [];

  let isProgress = true;
  while (isProgress) {
    isProgress = false;
    for (const column of derived) {
      if (emitted.has(column.id)) continue;
      const waitsFor = referencedIds(column.formula).filter(
        id => derivedIds.has(id) && id !== column.id
      );
      const usesItself = referencedIds(column.formula).includes(column.id);
      if (!usesItself && waitsFor.every(id => emitted.has(id))) {
        emitted.add(column.id);
        ordered.push(column);
        isProgress = true;
      }
    }
  }

  const looped = derived.filter(column => !emitted.has(column.id));

  return [
    ...ordered.map(column => {
      const parsed = parseFormula(column.formula, columns);

      return { id: column.id, ast: parsed.isOk ? parsed.ast : null };
    }),
    ...looped.map(column => ({ id: column.id, ast: null }))
  ];
};

/**
 * Every calculated column's value for one sample, working through the columns
 * in order so a column can use the ones before it. A value that cannot be
 * worked out (a missing input, a division by 0, a loop) is null, never 0.
 *
 * @param compiled - From {@link compileDerived}.
 * @param values - The sample's entered values by column id.
 */
export const calculateDerivedValues = (
  compiled: CompiledDerived[],
  values: ParameterValues
): Record<string, number | null> => {
  const context: ParameterValues = { ...values };
  const result: Record<string, number | null> = {};
  for (const { id, ast } of compiled) {
    const value = ast ? evaluateFormula(ast, context) : null;
    result[id] = value;
    if (value !== null) context[id] = value;
  }

  return result;
};

/**
 * The calculated values of many samples at once: sample id → column id → value.
 * The one place the app works these out, so the table, the sample page, plots,
 * exports and reports always agree.
 *
 * @param definitions - The experiment's entered columns.
 * @param derived - Its calculated columns, in display order.
 * @param samples - The samples.
 */
export const calculateForSamples = (
  definitions: FormulaColumn[],
  derived: Calculated[],
  samples: Pick<Sample, 'id' | 'values'>[]
): Record<string, Record<string, number | null>> => {
  const compiled = compileDerived(definitions, derived);

  return Object.fromEntries(
    samples.map(sample => [
      sample.id,
      calculateDerivedValues(compiled, sample.values)
    ])
  );
};
