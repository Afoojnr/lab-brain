import { and, eq, max, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { parameterDefinitions } from '@/lib/db/schema';

import type { ParameterDefinition, ParameterInput } from '../types';

const emptyToNull = (text: string): string | null =>
  text === '' ? null : text;

/**
 * An experiment's columns in display order: parameters first, then results,
 * each in the order they were added.
 *
 * @param experimentId - Owning experiment's id.
 */
export const listParameterDefinitions = async (
  experimentId: string
): Promise<ParameterDefinition[]> => {
  const db = await getDb();

  return db
    .select()
    .from(parameterDefinitions)
    .where(eq(parameterDefinitions.experimentId, experimentId))
    .orderBy(
      sql`${parameterDefinitions.role} = 'result'`,
      parameterDefinitions.position,
      sql`rowid`
    );
};

/**
 * Adds a parameter at the end of an experiment's columns. Input must already be
 * validated by `buildParameterFormSchema`. Samples recorded before it simply
 * have no value for it.
 *
 * @param experimentId - Owning experiment's id.
 * @param input - Validated name, unit, kind and default.
 * @returns The stored parameter.
 */
export const createParameterDefinition = async (
  experimentId: string,
  input: ParameterInput
): Promise<ParameterDefinition> => {
  const db = await getDb();
  const [last] = await db
    .select({ position: max(parameterDefinitions.position) })
    .from(parameterDefinitions)
    .where(eq(parameterDefinitions.experimentId, experimentId));
  const definition: ParameterDefinition = {
    id: crypto.randomUUID(),
    experimentId,
    name: input.name,
    unit: emptyToNull(input.unit),
    kind: input.kind,
    role: input.role,
    defaultValue: input.defaultValue,
    position: last?.position === null || !last ? 0 : last.position + 1
  };
  await db.insert(parameterDefinitions).values(definition);

  return definition;
};

/**
 * Changes a parameter's name, unit, kind, role or default value.
 *
 * @param experimentId - Owning experiment's id.
 * @param id - The parameter to change.
 * @param input - Validated parameter.
 * @returns The updated parameter, or undefined when the experiment has none with that id.
 */
export const updateParameterDefinition = async (
  experimentId: string,
  id: string,
  input: ParameterInput
): Promise<ParameterDefinition | undefined> => {
  const db = await getDb();
  const [updated] = await db
    .update(parameterDefinitions)
    .set({
      name: input.name,
      unit: emptyToNull(input.unit),
      kind: input.kind,
      role: input.role,
      defaultValue: input.defaultValue
    })
    .where(
      and(
        eq(parameterDefinitions.id, id),
        eq(parameterDefinitions.experimentId, experimentId)
      )
    )
    .returning();

  return updated;
};

/**
 * Removes a parameter. Callers must first make sure no sample uses it.
 *
 * @param experimentId - Owning experiment's id.
 * @param id - The parameter to remove.
 * @returns Whether a parameter was removed.
 */
export const deleteParameterDefinition = async (
  experimentId: string,
  id: string
): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(parameterDefinitions)
    .where(
      and(
        eq(parameterDefinitions.id, id),
        eq(parameterDefinitions.experimentId, experimentId)
      )
    )
    .returning({ id: parameterDefinitions.id });

  return removed.length > 0;
};

/**
 * Removes every column of an experiment.
 *
 * @param experimentId - The experiment being removed.
 * @returns How many columns were removed.
 */
export const deleteDefinitionsOfExperiment = async (
  experimentId: string
): Promise<number> => {
  const db = await getDb();
  const removed = await db
    .delete(parameterDefinitions)
    .where(eq(parameterDefinitions.experimentId, experimentId))
    .returning({ id: parameterDefinitions.id });

  return removed.length;
};
