import { and, asc, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { experiments } from '@/lib/db/schema';

import type { ExperimentFormValues } from '../schemas/schemas';
import type { Experiment } from '../types';

const emptyToNull = (text: string): string | null =>
  text === '' ? null : text;

/** A project's experiments, oldest first, like the sheets of a workbook. */
export const listExperimentsByProject = async (
  projectId: string
): Promise<Experiment[]> => {
  const db = await getDb();

  return db
    .select()
    .from(experiments)
    .where(eq(experiments.projectId, projectId))
    .orderBy(asc(experiments.createdAt), sql`rowid`);
};

/** One experiment by id. */
export const getExperimentById = async (
  id: string
): Promise<Experiment | undefined> => {
  const db = await getDb();
  const [experiment] = await db
    .select()
    .from(experiments)
    .where(eq(experiments.id, id));

  return experiment;
};

/**
 * One experiment, only when it belongs to the given project, so a URL cannot
 * reach an experiment through the wrong project.
 */
export const getExperimentInProject = async (
  projectId: string,
  experimentId: string
): Promise<Experiment | undefined> => {
  const db = await getDb();
  const [experiment] = await db
    .select()
    .from(experiments)
    .where(
      and(
        eq(experiments.id, experimentId),
        eq(experiments.projectId, projectId)
      )
    );

  return experiment;
};

/**
 * Stores a new experiment. Input must already be validated by
 * `experimentFormSchema`.
 */
export const createExperiment = async (
  projectId: string,
  values: ExperimentFormValues
): Promise<Experiment> => {
  const db = await getDb();
  const experiment: Experiment = {
    id: crypto.randomUUID(),
    projectId,
    name: values.name,
    codePrefix: values.codePrefix,
    protocol: emptyToNull(values.protocol),
    createdAt: new Date()
  };
  await db.insert(experiments).values(experiment);

  return experiment;
};

/** Changes an experiment's name, code prefix and protocol. */
export const updateExperiment = async (
  id: string,
  values: ExperimentFormValues
): Promise<Experiment | undefined> => {
  const db = await getDb();
  const [updated] = await db
    .update(experiments)
    .set({
      name: values.name,
      codePrefix: values.codePrefix,
      protocol: emptyToNull(values.protocol)
    })
    .where(eq(experiments.id, id))
    .returning();

  return updated;
};

/**
 * Removes an experiment's own record. Everything that belongs to it is removed
 * by the caller first.
 */
export const deleteExperiment = async (id: string): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(experiments)
    .where(eq(experiments.id, id))
    .returning({ id: experiments.id });

  return removed.length > 0;
};
