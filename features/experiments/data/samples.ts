import { and, asc, eq, inArray, max, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import type { Database } from '@/lib/db/client';
import { experiments, sampleStudies, samples, studies } from '@/lib/db/schema';

import type { SampleInput } from '../schemas/schemas';
import type { Sample } from '../types';

type SampleRow = typeof samples.$inferSelect;

/** Adds each sample's studies, in the order they were assigned. */
const withStudies = async (
  database: Database,
  rows: SampleRow[]
): Promise<Sample[]> => {
  if (rows.length === 0) return [];

  const links = await database
    .select()
    .from(sampleStudies)
    .where(
      inArray(
        sampleStudies.sampleId,
        rows.map(row => row.id)
      )
    )
    .orderBy(asc(sampleStudies.position));
  const byStudy = new Map<string, string[]>();
  for (const link of links) {
    byStudy.set(link.sampleId, [
      ...(byStudy.get(link.sampleId) ?? []),
      link.studyId
    ]);
  }

  return rows.map(row => ({ ...row, studyIds: byStudy.get(row.id) ?? [] }));
};

/** Replaces a sample's studies, keeping only studies of its own experiment. */
const replaceStudies = async (
  database: Database,
  experimentId: string,
  sampleId: string,
  studyIds: string[]
) => {
  await database
    .delete(sampleStudies)
    .where(eq(sampleStudies.sampleId, sampleId));
  if (studyIds.length === 0) return;

  const valid = await database
    .select({ id: studies.id })
    .from(studies)
    .where(
      and(eq(studies.experimentId, experimentId), inArray(studies.id, studyIds))
    );
  const validIds = new Set(valid.map(study => study.id));
  const kept = [...new Set(studyIds)].filter(id => validIds.has(id));
  if (kept.length === 0) return;

  await database
    .insert(sampleStudies)
    .values(kept.map((studyId, position) => ({ sampleId, studyId, position })));
};

/** An experiment's samples, oldest first, like the rows of a spreadsheet. */
export const listSamplesByExperiment = async (
  experimentId: string
): Promise<Sample[]> => {
  const db = await getDb();
  const rows = await db
    .select()
    .from(samples)
    .where(eq(samples.experimentId, experimentId))
    .orderBy(samples.createdAt, sql`rowid`);

  return withStudies(db, rows);
};

/** One sample by id. */
export const getSampleById = async (
  id: string
): Promise<Sample | undefined> => {
  const db = await getDb();
  const rows = await db.select().from(samples).where(eq(samples.id, id));

  return (await withStudies(db, rows))[0];
};

/**
 * Every sample code in a project, across all its experiments, so a new code can
 * be checked and suggested against all of them.
 */
export const listSampleCodesByProject = async (
  projectId: string
): Promise<string[]> => {
  const db = await getDb();
  const rows = await db
    .select({ code: samples.code })
    .from(samples)
    .innerJoin(experiments, eq(samples.experimentId, experiments.id))
    .where(eq(experiments.projectId, projectId));

  return rows.map(row => row.code);
};

/**
 * Whether any sample holds a value for this parameter, which makes it unsafe
 * to delete or to change its kind.
 */
export const isParameterInUse = async (
  definitionId: string
): Promise<boolean> => {
  const db = await getDb();
  const [used] = await db
    .select({ id: samples.id })
    .from(samples)
    .where(
      sql`json_type(${samples.values}, ${`$."${definitionId.replaceAll('"', '')}"`}) is not null`
    )
    .limit(1);

  return used !== undefined;
};

/**
 * Stores a new sample. Input must already be validated by
 * `buildSampleFormSchema` and converted by `toSampleInput`.
 */
export const createSample = async (
  experimentId: string,
  input: SampleInput
): Promise<Sample> => {
  const db = await getDb();
  const row: SampleRow = {
    id: crypto.randomUUID(),
    experimentId,
    code: input.code,
    performedOn: input.performedOn,
    values: input.values,
    implementation: input.implementation,
    observation: input.observation,
    note: input.note,
    createdAt: new Date()
  };
  await db.insert(samples).values(row);
  await replaceStudies(db, experimentId, row.id, input.studyIds);

  return (await getSampleById(row.id)) as Sample;
};

/**
 * Changes a sample's code, date, values, studies, implementation, observation
 * and note.
 */
export const updateSample = async (
  experimentId: string,
  id: string,
  input: SampleInput
): Promise<Sample | undefined> => {
  const db = await getDb();
  const updated = await db
    .update(samples)
    .set({
      code: input.code,
      performedOn: input.performedOn,
      values: input.values,
      implementation: input.implementation,
      observation: input.observation,
      note: input.note
    })
    .where(and(eq(samples.id, id), eq(samples.experimentId, experimentId)))
    .returning({ id: samples.id });
  if (updated.length === 0) return undefined;

  await replaceStudies(db, experimentId, id, input.studyIds);

  return getSampleById(id);
};

/**
 * Tags samples of one experiment with a study. Samples that already have it
 * keep it once, and ids that are not in the experiment are skipped.
 */
export const assignSamplesToStudy = async (
  experimentId: string,
  studyId: string,
  sampleIds: string[]
): Promise<number> => {
  const db = await getDb();
  if (sampleIds.length === 0) return 0;

  const [study] = await db
    .select({ id: studies.id })
    .from(studies)
    .where(
      and(eq(studies.id, studyId), eq(studies.experimentId, experimentId))
    );
  if (!study) return 0;

  const targets = await db
    .select({ id: samples.id })
    .from(samples)
    .where(
      and(
        eq(samples.experimentId, experimentId),
        inArray(samples.id, sampleIds)
      )
    );
  const links = await db
    .select()
    .from(sampleStudies)
    .where(
      inArray(
        sampleStudies.sampleId,
        targets.map(target => target.id)
      )
    );
  const alreadyTagged = new Set(
    links.filter(link => link.studyId === studyId).map(link => link.sampleId)
  );
  const toTag = targets.filter(target => !alreadyTagged.has(target.id));
  if (toTag.length === 0) return 0;

  const [highest] = await db
    .select({ position: max(sampleStudies.position) })
    .from(sampleStudies)
    .where(
      inArray(
        sampleStudies.sampleId,
        toTag.map(target => target.id)
      )
    );
  const position = (highest?.position ?? -1) + 1;
  await db
    .insert(sampleStudies)
    .values(toTag.map(target => ({ sampleId: target.id, studyId, position })));

  return toTag.length;
};

/**
 * Removes a sample's own record. Its measurements and files are removed by the
 * caller first.
 */
export const deleteSample = async (
  experimentId: string,
  id: string
): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(samples)
    .where(and(eq(samples.id, id), eq(samples.experimentId, experimentId)))
    .returning({ id: samples.id });

  return removed.length > 0;
};

/**
 * Takes a study off every sample of the experiment that has it; the samples and
 * their data stay.
 */
export const removeStudyFromSamples = async (
  experimentId: string,
  studyId: string
): Promise<number> => {
  const db = await getDb();
  const [study] = await db
    .select({ id: studies.id })
    .from(studies)
    .where(
      and(eq(studies.id, studyId), eq(studies.experimentId, experimentId))
    );
  if (!study) return 0;

  const removed = await db
    .delete(sampleStudies)
    .where(eq(sampleStudies.studyId, studyId))
    .returning({ sampleId: sampleStudies.sampleId });

  return removed.length;
};
