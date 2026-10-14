import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { references } from '@/lib/db/schema';

import type { Reference } from '../types';

/**
 * A project's references, oldest first.
 *
 * @param projectId - Owning project's id.
 */
export const listReferencesByProject = async (
  projectId: string
): Promise<Reference[]> => {
  const db = await getDb();

  return db
    .select()
    .from(references)
    .where(eq(references.projectId, projectId))
    .orderBy(references.createdAt, sql`rowid`);
};

/**
 * One reference, only when it belongs to the project.
 *
 * @param projectId - The project the caller says owns it.
 * @param id - The reference's id.
 */
export const getReference = async (
  projectId: string,
  id: string
): Promise<Reference | undefined> => {
  const db = await getDb();
  const [reference] = await db
    .select()
    .from(references)
    .where(and(eq(references.id, id), eq(references.projectId, projectId)));

  return reference;
};

/** Any reference by id, for serving its file; the caller checks the project. */
export const getReferenceById = async (
  id: string
): Promise<Reference | undefined> => {
  const db = await getDb();
  const [reference] = await db
    .select()
    .from(references)
    .where(eq(references.id, id));

  return reference;
};

/** Stores a new reference; the input is already validated and its files written. */
export const createReference = async (
  reference: Reference
): Promise<Reference> => {
  const db = await getDb();
  await db.insert(references).values(reference);

  return reference;
};

type ReferenceChanges = Partial<
  Pick<Reference, 'title' | 'authors' | 'year' | 'url' | 'note' | 'summary'>
>;

/**
 * Changes a reference's details or summary.
 *
 * @returns The updated reference, or undefined when it is not the project's.
 */
export const updateReference = async (
  projectId: string,
  id: string,
  changes: ReferenceChanges
): Promise<Reference | undefined> => {
  if (Object.keys(changes).length === 0) return getReference(projectId, id);

  const db = await getDb();
  const [updated] = await db
    .update(references)
    .set(changes)
    .where(and(eq(references.id, id), eq(references.projectId, projectId)))
    .returning();

  return updated;
};

/**
 * Removes a reference's record (its files are removed by the caller).
 *
 * @returns The removed reference, or undefined when it is not the project's.
 */
export const deleteReference = async (
  projectId: string,
  id: string
): Promise<Reference | undefined> => {
  const db = await getDb();
  const [removed] = await db
    .delete(references)
    .where(and(eq(references.id, id), eq(references.projectId, projectId)))
    .returning();

  return removed;
};
