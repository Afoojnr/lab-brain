import type { Reference } from '../types';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so the list resets when the dev server restarts; the
// files and the text read from them stay in storage.
// On `globalThis` because a Route Handler (the assistant) is bundled apart from
// the pages and actions: a plain module-level list would be a separate copy
// there and would not see what was just created. A database has no such problem.
const store = globalThis as { __labBrainReferences?: Reference[] };
const references: Reference[] = (store.__labBrainReferences ??= []);

/**
 * A project's references, oldest first.
 *
 * @param projectId - Owning project's id.
 */
export const listReferencesByProject = async (
  projectId: string
): Promise<Reference[]> =>
  references
    .filter(reference => reference.projectId === projectId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

/**
 * One reference, only when it belongs to the project.
 *
 * @param projectId - The project the caller says owns it.
 * @param id - The reference's id.
 */
export const getReference = async (
  projectId: string,
  id: string
): Promise<Reference | undefined> =>
  references.find(
    reference => reference.id === id && reference.projectId === projectId
  );

/** Any reference by id, for serving its file; the caller checks the project. */
export const getReferenceById = async (
  id: string
): Promise<Reference | undefined> =>
  references.find(reference => reference.id === id);

/** Stores a new reference; the input is already validated and its files written. */
export const createReference = async (
  reference: Reference
): Promise<Reference> => {
  references.push(reference);

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
  const reference = await getReference(projectId, id);
  if (!reference) return undefined;

  Object.assign(reference, changes);

  return reference;
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
  const index = references.findIndex(
    reference => reference.id === id && reference.projectId === projectId
  );
  if (index === -1) return undefined;

  return references.splice(index, 1)[0];
};
