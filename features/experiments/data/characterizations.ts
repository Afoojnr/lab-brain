import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { characterizations, samples } from '@/lib/db/schema';

import type { CharacterizationFormValues } from '../schemas/schemas';
import type { Characterization } from '../types';
import { listExperimentsByProject } from './experiments';

const emptyToNull = (text: string): string | null =>
  text === '' ? null : text;

/** Oldest date first, ones without a date last, then in the order they were made. */
const byDateThenCreation = [
  sql`${characterizations.measuredOn} is null`,
  characterizations.measuredOn,
  characterizations.createdAt,
  sql`${characterizations}.rowid`
];

/**
 * A sample's characterizations, oldest date first; ones without a date last.
 */
export const listCharacterizationsBySample = async (
  sampleId: string
): Promise<Characterization[]> => {
  const db = await getDb();

  return db
    .select()
    .from(characterizations)
    .where(eq(characterizations.sampleId, sampleId))
    .orderBy(...byDateThenCreation);
};

/** Every characterization of an experiment's samples, for its samples table. */
export const listCharacterizationsByExperiment = async (
  experimentId: string
): Promise<Characterization[]> => {
  const db = await getDb();
  const rows = await db
    .select({ characterization: characterizations })
    .from(characterizations)
    .innerJoin(samples, eq(characterizations.sampleId, samples.id))
    .where(eq(samples.experimentId, experimentId))
    .orderBy(...byDateThenCreation);

  return rows.map(row => row.characterization);
};

/**
 * The techniques already used anywhere in a project, spelled as first typed,
 * so a new record can reuse them instead of creating near-duplicates.
 */
export const listTechniquesByProject = async (
  projectId: string
): Promise<string[]> => {
  const techniques: string[] = [];

  for (const experiment of await listExperimentsByProject(projectId)) {
    for (const item of await listCharacterizationsByExperiment(experiment.id)) {
      if (!techniques.includes(item.technique)) techniques.push(item.technique);
    }
  }

  return techniques;
};

/**
 * One characterization, but only when it belongs to the given sample, so a
 * record can never be reached through another sample's page.
 */
export const getCharacterizationOfSample = async (
  sampleId: string,
  id: string
): Promise<Characterization | undefined> => {
  const db = await getDb();
  const [item] = await db
    .select()
    .from(characterizations)
    .where(
      and(
        eq(characterizations.id, id),
        eq(characterizations.sampleId, sampleId)
      )
    );

  return item;
};

/**
 * Stores a new characterization. Input must already be validated by
 * `characterizationFormSchema`, with the technique spelled by `matchTechnique`.
 */
export const createCharacterization = async (
  sampleId: string,
  values: CharacterizationFormValues
): Promise<Characterization> => {
  const db = await getDb();
  const item: Characterization = {
    id: crypto.randomUUID(),
    sampleId,
    technique: values.technique,
    measuredOn: emptyToNull(values.measuredOn),
    note: emptyToNull(values.note),
    createdAt: new Date()
  };
  await db.insert(characterizations).values(item);

  return item;
};

/** Changes a characterization's technique, date and note. */
export const updateCharacterization = async (
  sampleId: string,
  id: string,
  values: CharacterizationFormValues
): Promise<Characterization | undefined> => {
  const db = await getDb();
  const [updated] = await db
    .update(characterizations)
    .set({
      technique: values.technique,
      measuredOn: emptyToNull(values.measuredOn),
      note: emptyToNull(values.note)
    })
    .where(
      and(
        eq(characterizations.id, id),
        eq(characterizations.sampleId, sampleId)
      )
    )
    .returning();

  return updated;
};

/** Removes a characterization. */
export const deleteCharacterization = async (
  sampleId: string,
  id: string
): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(characterizations)
    .where(
      and(
        eq(characterizations.id, id),
        eq(characterizations.sampleId, sampleId)
      )
    )
    .returning({ id: characterizations.id });

  return removed.length > 0;
};

/** Removes every characterization of a sample. */
export const deleteCharacterizationsOfSample = async (
  sampleId: string
): Promise<Characterization[]> => {
  const db = await getDb();

  return db
    .delete(characterizations)
    .where(eq(characterizations.sampleId, sampleId))
    .returning();
};
