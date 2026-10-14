import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { derivedColumns } from '@/lib/db/schema';

import type { DerivedColumn, DerivedColumnInput } from '../types';

const emptyToNull = (text: string): string | null =>
  text === '' ? null : text;

/** An experiment's calculated columns, in display order. */
export const listDerivedColumns = async (
  experimentId: string
): Promise<DerivedColumn[]> => {
  const db = await getDb();

  return db
    .select()
    .from(derivedColumns)
    .where(eq(derivedColumns.experimentId, experimentId))
    .orderBy(derivedColumns.position, sql`rowid`);
};

/**
 * The calculated columns whose formula uses a given column, so that column is
 * not deleted or changed under them.
 */
export const listDerivedColumnsUsing = async (
  experimentId: string,
  columnId: string
): Promise<DerivedColumn[]> =>
  (await listDerivedColumns(experimentId)).filter(column =>
    column.formula.includes(`[#${columnId}]`)
  );

/**
 * Adds a calculated column after the existing ones. Input must already be
 * validated.
 */
export const createDerivedColumn = async (
  experimentId: string,
  input: DerivedColumnInput
): Promise<DerivedColumn> => {
  const db = await getDb();
  const existing = await listDerivedColumns(experimentId);
  const column: DerivedColumn = {
    id: crypto.randomUUID(),
    experimentId,
    name: input.name,
    unit: emptyToNull(input.unit),
    formula: input.formula,
    position: existing.length
  };
  await db.insert(derivedColumns).values(column);

  return column;
};

/** Changes a calculated column's name, unit or formula. */
export const updateDerivedColumn = async (
  experimentId: string,
  id: string,
  input: DerivedColumnInput
): Promise<DerivedColumn | undefined> => {
  const db = await getDb();
  const [updated] = await db
    .update(derivedColumns)
    .set({
      name: input.name,
      unit: emptyToNull(input.unit),
      formula: input.formula
    })
    .where(
      and(
        eq(derivedColumns.id, id),
        eq(derivedColumns.experimentId, experimentId)
      )
    )
    .returning();

  return updated;
};

/** Removes a calculated column. */
export const deleteDerivedColumn = async (
  experimentId: string,
  id: string
): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(derivedColumns)
    .where(
      and(
        eq(derivedColumns.id, id),
        eq(derivedColumns.experimentId, experimentId)
      )
    )
    .returning({ id: derivedColumns.id });

  return removed.length > 0;
};

/** Removes every calculated column of an experiment. */
export const deleteDerivedColumnsOfExperiment = async (
  experimentId: string
): Promise<number> => {
  const db = await getDb();
  const removed = await db
    .delete(derivedColumns)
    .where(eq(derivedColumns.experimentId, experimentId))
    .returning({ id: derivedColumns.id });

  return removed.length;
};
