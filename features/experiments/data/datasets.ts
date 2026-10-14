import { asc, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { characterizations, datasets } from '@/lib/db/schema';

import type { Dataset } from '../types';

const oldestFirst = [asc(datasets.uploadedAt), sql`${datasets}.rowid`];

/** A characterization's files, oldest first. */
export const listDatasetsByCharacterization = async (
  characterizationId: string
): Promise<Dataset[]> => {
  const db = await getDb();

  return db
    .select()
    .from(datasets)
    .where(eq(datasets.characterizationId, characterizationId))
    .orderBy(...oldestFirst);
};

/** Every file attached to any of a sample's characterizations. */
export const listDatasetsBySample = async (
  sampleId: string
): Promise<Dataset[]> => {
  const db = await getDb();
  const rows = await db
    .select({ dataset: datasets })
    .from(datasets)
    .innerJoin(
      characterizations,
      eq(datasets.characterizationId, characterizations.id)
    )
    .where(eq(characterizations.sampleId, sampleId))
    .orderBy(...oldestFirst);

  return rows.map(row => row.dataset);
};

/** One file record by id. */
export const getDatasetById = async (
  id: string
): Promise<Dataset | undefined> => {
  const db = await getDb();
  const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));

  return dataset;
};

/** Records a file already written to storage. */
export const createDataset = async (
  characterizationId: string,
  file: Pick<
    Dataset,
    | 'fileName'
    | 'folder'
    | 'relativePath'
    | 'storagePath'
    | 'contentType'
    | 'sizeBytes'
  >
): Promise<Dataset> => {
  const db = await getDb();
  const dataset: Dataset = {
    id: crypto.randomUUID(),
    characterizationId,
    ...file,
    uploadedAt: new Date()
  };
  await db.insert(datasets).values(dataset);

  return dataset;
};

/** Removes a file record (the caller removes the file from storage). */
export const deleteDataset = async (id: string): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(datasets)
    .where(eq(datasets.id, id))
    .returning({ id: datasets.id });

  return removed.length > 0;
};

/** Removes every file record of a characterization. */
export const deleteDatasetsOfCharacterization = async (
  characterizationId: string
): Promise<Dataset[]> => {
  const db = await getDb();

  return db
    .delete(datasets)
    .where(eq(datasets.characterizationId, characterizationId))
    .returning();
};
