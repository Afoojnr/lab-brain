import type { DerivedColumn, DerivedColumnInput } from '../types';
import { DEMO_DERIVED_COLUMNS } from './demo-derived-columns';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
const derivedColumns: DerivedColumn[] = [...DEMO_DERIVED_COLUMNS];

/**
 * An experiment's calculated columns in the order they were added.
 *
 * @param experimentId - Owning experiment's id.
 */
export const listDerivedColumns = async (
  experimentId: string
): Promise<DerivedColumn[]> =>
  derivedColumns
    .filter(column => column.experimentId === experimentId)
    .sort((a, b) => a.position - b.position);

/**
 * The calculated columns whose formula uses a column, so that column is not
 * deleted or turned into text from under them.
 *
 * @param experimentId - Owning experiment's id.
 * @param columnId - The entered column's id.
 */
export const listDerivedColumnsUsing = async (
  experimentId: string,
  columnId: string
): Promise<DerivedColumn[]> =>
  (await listDerivedColumns(experimentId)).filter(column =>
    column.formula.includes(`[#${columnId}]`)
  );

/**
 * Adds a calculated column at the end. Input must already be validated by
 * `buildDerivedColumnFormSchema` (the formula parses against the experiment's columns).
 *
 * @param experimentId - Owning experiment's id.
 * @param input - Validated name, unit and stored formula.
 */
export const createDerivedColumn = async (
  experimentId: string,
  input: DerivedColumnInput
): Promise<DerivedColumn> => {
  const existing = await listDerivedColumns(experimentId);
  const column: DerivedColumn = {
    id: crypto.randomUUID(),
    experimentId,
    name: input.name,
    unit: input.unit === '' ? null : input.unit,
    formula: input.formula,
    position: existing.length
  };

  derivedColumns.push(column);
  return column;
};

/**
 * Changes a calculated column's name, unit and formula.
 *
 * @param experimentId - Owning experiment's id.
 * @param id - The column to change.
 * @param input - Validated name, unit and stored formula.
 * @returns The updated column, or undefined when the experiment has none with that id.
 */
export const updateDerivedColumn = async (
  experimentId: string,
  id: string,
  input: DerivedColumnInput
): Promise<DerivedColumn | undefined> => {
  const index = derivedColumns.findIndex(
    column => column.id === id && column.experimentId === experimentId
  );
  const existing = derivedColumns[index];
  if (!existing) return undefined;

  const updated: DerivedColumn = {
    ...existing,
    name: input.name,
    unit: input.unit === '' ? null : input.unit,
    formula: input.formula
  };
  derivedColumns[index] = updated;
  return updated;
};

/**
 * Removes a calculated column. Nothing else depends on it.
 *
 * @param experimentId - Owning experiment's id.
 * @param id - The column to remove.
 * @returns Whether a column was removed.
 */
export const deleteDerivedColumn = async (
  experimentId: string,
  id: string
): Promise<boolean> => {
  const index = derivedColumns.findIndex(
    column => column.id === id && column.experimentId === experimentId
  );
  if (index === -1) return false;

  derivedColumns.splice(index, 1);
  return true;
};
