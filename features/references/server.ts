// Public server API of the references feature: what other features (the
// assistant) may call. Never import this from client code.
import { getStorage } from '@/lib/storage';

import {
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
