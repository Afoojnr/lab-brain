import path from 'node:path';

import { BACKUPS_FOLDER, listBackupsIn } from '@/lib/db/backup';
import { FILES_FOLDER } from '@/lib/storage';
import { createLocalStorage, folderExists } from '@/lib/storage/local-adapter';

/** The folder Lab Brain creates inside the folder the user picks. */
export const APP_FOLDER_NAME = 'Lab Brain';

export type FolderCheck =
  | {
      isOk: false;
      reason: 'empty' | 'notAbsolute' | 'notFound' | 'notWritable';
    }
  | {
      isOk: true;
      /** The folder the user picked, tidied (no trailing separator). */
      chosen: string;
      /** Where files and backups will go: a `Lab Brain` folder inside it. */
      folder: string;
      /** That folder does not exist yet, so it will be created. */
      isNew: boolean;
      /** It already holds Lab Brain files, for instance from another computer. */
      hasFiles: boolean;
      /** It already holds database backups. */
      hasBackups: boolean;
    };

/**
 * Where files and backups go for a picked folder. A new `Lab Brain` folder is
 * made inside it, so they never mix with the user's other files. A folder that
 * is already a Lab Brain folder (named so, or holding `files` or `backups`) is
 * used as it is, so choosing it again never nests another one inside.
 */
const resolveAppFolder = async (chosen: string): Promise<string> => {
  if (path.basename(chosen) === APP_FOLDER_NAME) return chosen;

  const holdsOurs =
    (await folderExists(path.join(chosen, FILES_FOLDER))) ||
    (await folderExists(path.join(chosen, BACKUPS_FOLDER)));

  return holdsOurs ? chosen : path.join(chosen, APP_FOLDER_NAME);
};

/** Whether the app can create and remove a file in an existing folder. */
const canWriteIn = async (folder: string): Promise<boolean> => {
  const storage = createLocalStorage(folder);
  const probe = `.lab-brain-write-test-${Date.now()}`;
  try {
    await storage.upload(probe, new Uint8Array([1]));
    await storage.delete(probe);

    return true;
  } catch {
    return false;
  }
};

/**
 * Checks a folder the user picked before anything is moved: it must be an
 * absolute path to an existing folder the app can write to.
 */
export const inspectFolder = async (typed: string): Promise<FolderCheck> => {
  const trimmed = typed.trim();
  if (trimmed === '') return { isOk: false, reason: 'empty' };
  if (!path.isAbsolute(trimmed)) return { isOk: false, reason: 'notAbsolute' };

  const chosen = path.resolve(trimmed);
  if (!(await folderExists(chosen))) return { isOk: false, reason: 'notFound' };

  const folder = await resolveAppFolder(chosen);
  const isNew = !(await folderExists(folder));
  if (!(await canWriteIn(isNew ? chosen : folder))) {
    return { isOk: false, reason: 'notWritable' };
  }

  const storage = createLocalStorage(folder);

  return {
    isOk: true,
    chosen,
    folder,
    isNew,
    hasFiles: isNew ? false : (await storage.list(FILES_FOLDER)).length > 0,
    hasBackups: isNew
      ? false
      : (await listBackupsIn(path.join(folder, BACKUPS_FOLDER))).length > 0
  };
};
