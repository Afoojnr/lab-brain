import path from 'node:path';

import { listReferencedFiles } from '@/lib/db/referenced-files';
import { FILES_FOLDER, getStorage } from '@/lib/storage';
import { createLocalStorage } from '@/lib/storage/local-adapter';

export type MoveResult =
  | {
      isOk: true;
      /** Files copied. */
      copied: number;
      /** Files in the old folder that no record uses, so they were not copied. */
      leftBehind: number;
    }
  | { isOk: false; reason: 'collision' | 'unverified'; path: string };

/**
 * Copies the attached files the records use from the storage in use into a new
 * data folder's `files` folder, and checks each copy has the same size before
 * reporting success. Files no record points at are left where they are. It never
 * replaces a file that is already there, and it leaves the old files in place:
 * the user removes them when they are ready.
 *
 * @param folder - The new data folder (already checked).
 */
export const copyFilesToFolder = async (
  folder: string
): Promise<MoveResult> => {
  const source = getStorage();
  const target = createLocalStorage(path.join(folder, FILES_FOLDER));
  const inSource = new Set(await source.list(''));
  const files = (await listReferencedFiles()).filter(file =>
    inSource.has(file)
  );
  const existing = new Set(await target.list(''));

  const collision = files.find(file => existing.has(file));
  if (collision) return { isOk: false, reason: 'collision', path: collision };

  for (const file of files) {
    const bytes = await source.download(file);
    if (!bytes) continue;

    await target.upload(file, bytes);
    const copy = await target.download(file);
    if (copy?.byteLength !== bytes.byteLength) {
      return { isOk: false, reason: 'unverified', path: file };
    }
  }

  return {
    isOk: true,
    copied: files.length,
    leftBehind: inSource.size - files.length
  };
};
