// Public server API of the references feature: what other features (the
// assistant) may call. Never import this from client code.
import { getStorage } from '@/lib/storage';

import {
  deleteReference,
  getReference,
  getReferenceById,
  listReferencesByProject,
  updateReference
} from './data/references';
import { readSlice } from './extract/stored-text';
import type { Reference } from './types';

export { SUMMARY_SOURCE_CHARS } from './config/limits';
export {
  getReference,
  getReferenceById,
  listReferencesByProject,
  readSlice,
  updateReference
};

/**
 * The text read from a reference when it was added, from storage.
 *
 * @param reference - The reference.
 * @returns The text, or null when the file is missing.
 */
export const readReferenceText = async (
  reference: Pick<Reference, 'textPath'>
): Promise<string | null> => {
  const bytes = await getStorage().download(reference.textPath);

  return bytes ? new TextDecoder().decode(bytes) : null;
};

/**
 * Removes every reference of a project that was deleted: the records, and each
 * one's PDF and extracted text from storage.
 *
 * @param projectId - The project that is gone.
 * @returns How many references were removed.
 */
export const deleteReferencesOf = async (
  projectId: string
): Promise<number> => {
  const storage = getStorage();
  const references = await listReferencesByProject(projectId);
  for (const reference of references) {
    await deleteReference(projectId, reference.id);
    await Promise.all(
      [reference.textPath, reference.filePath]
        .filter((path): path is string => path !== null)
        .map(path => storage.delete(path).catch(() => false))
    );
  }

  return references.length;
};
