'use server';

import { revalidatePath } from 'next/cache';

import { getStorage } from '@/lib/storage';

import { deleteReference } from '../data/references';

/**
 * Removes a reference and its stored files (the PDF and the text read from
 * it), then refreshes the project page.
 */
export const deleteReferenceAction = async (
  projectId: string,
  referenceId: string
): Promise<boolean> => {
  const reference = await deleteReference(projectId, referenceId);
  if (!reference) return false;

  const storage = getStorage();
  await Promise.all(
    [reference.textPath, reference.filePath]
      .filter((path): path is string => path !== null)
      .map(path => storage.delete(path).catch(() => false))
  );
  revalidatePath(`/projects/${projectId}`);

  return true;
};
