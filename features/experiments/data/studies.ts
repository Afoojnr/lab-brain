import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { studies } from '@/lib/db/schema';

import type { StudyFormValues } from '../schemas/schemas';
import type { Study } from '../types';

const emptyToNull = (text: string): string | null =>
  text === '' ? null : text;

/** An experiment's studies, oldest first. */
export const listStudiesByExperiment = async (
  experimentId: string
): Promise<Study[]> => {
  const db = await getDb();

  return db
    .select()
    .from(studies)
    .where(eq(studies.experimentId, experimentId))
    .orderBy(studies.createdAt, sql`rowid`);
};

/** One study, only when it belongs to the given experiment. */
export const getStudyInExperiment = async (
  experimentId: string,
  id: string
): Promise<Study | undefined> => {
  const db = await getDb();
  const [study] = await db
    .select()
    .from(studies)
    .where(and(eq(studies.id, id), eq(studies.experimentId, experimentId)));

  return study;
};

/**
 * Changes a study's name and description. Input must already be validated by
 * `studyFormSchema`.
 */
export const updateStudy = async (
  experimentId: string,
  id: string,
  values: StudyFormValues
): Promise<Study | undefined> => {
  const db = await getDb();
  const [updated] = await db
    .update(studies)
    .set({
      name: values.name,
      description: emptyToNull(values.description)
    })
    .where(and(eq(studies.id, id), eq(studies.experimentId, experimentId)))
    .returning();

  return updated;
};

/** Stores a new study. Input must already be validated by `studyFormSchema`. */
export const createStudy = async (
  experimentId: string,
  values: StudyFormValues
): Promise<Study> => {
  const db = await getDb();
  const study: Study = {
    id: crypto.randomUUID(),
    experimentId,
    name: values.name,
    description: emptyToNull(values.description),
    createdAt: new Date()
  };
  await db.insert(studies).values(study);

  return study;
};

/** Removes a study's own record. Callers take it off the samples first. */
export const deleteStudy = async (
  experimentId: string,
  id: string
): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(studies)
    .where(and(eq(studies.id, id), eq(studies.experimentId, experimentId)))
    .returning({ id: studies.id });

  return removed.length > 0;
};

/** Removes every study of an experiment. */
export const deleteStudiesOfExperiment = async (
  experimentId: string
): Promise<number> => {
  const db = await getDb();
  const removed = await db
    .delete(studies)
    .where(eq(studies.experimentId, experimentId))
    .returning({ id: studies.id });

  return removed.length;
};
