'use server';

import { revalidatePath } from 'next/cache';

import { isDemoMode, writeLocalSettings } from '@/lib/config/local-settings';
import { backUpNow } from '@/lib/db/backup';
import { restoreBackup } from '@/lib/db/restore';

import { copyFilesToFolder } from '../data-folder/move-files';
import { createFolder } from '@/lib/storage/local-adapter';

import { APP_FOLDER_NAME, inspectFolder } from '../data-folder/inspect-folder';
import type { FolderCheck } from '../data-folder/inspect-folder';

export type DataFolderResult =
  | { isOk: true }
  | {
      isOk: false;
      code:
        | 'unavailable'
        | 'empty'
        | 'notAbsolute'
        | 'notFound'
        | 'notWritable'
        | 'collision'
        | 'unverified'
        | 'backupFailed'
        | 'restoreFailed';
      /** The file that stopped a move, when one did. */
      path?: string;
    };

/** The data folder cannot be changed on the demo or when the server fixes the storage folder. */
const isChangeable = () => !isDemoMode() && !process.env.LAB_BRAIN_STORAGE_DIR;

/**
 * Looks at a typed folder without changing anything: whether it exists, can be
 * written to, and already holds Lab Brain files or backups.
 */
export const checkDataFolderAction = async (
  typed: string
): Promise<FolderCheck | { isOk: false; reason: 'unavailable' }> =>
  isChangeable()
    ? inspectFolder(typed)
    : { isOk: false, reason: 'unavailable' };

/**
 * Makes a `Lab Brain` folder inside the picked folder the place files and
 * backups go (or the picked folder itself when it already is one). `move`
 * copies the current files there first, checking each and never replacing one;
 * `use` takes the folder as it is.
 */
export const setDataFolderAction = async (
  typed: string,
  mode: 'move' | 'use'
): Promise<DataFolderResult> => {
  if (!isChangeable()) return { isOk: false, code: 'unavailable' };

  const check = await inspectFolder(typed);
  if (!check.isOk) return { isOk: false, code: check.reason };

  // The Lab Brain folder is made inside the picked folder; a folder that
  // already exists is used as it is, never replaced.
  if (check.isNew) {
    const created = await createFolder(check.chosen, APP_FOLDER_NAME);
    if (!created.isOk && created.reason !== 'exists') {
      return { isOk: false, code: 'notWritable' };
    }
  }

  if (mode === 'move') {
    const moved = await copyFilesToFolder(check.folder);
    if (!moved.isOk) {
      return { isOk: false, code: moved.reason, path: moved.path };
    }
  }

  writeLocalSettings({ dataFolder: check.folder });
  // A first backup right away, so the folder is not empty of safety; a failure
  // shows in Settings but does not undo the choice.
  await backUpNow().catch(() => undefined);
  revalidatePath('/', 'layout');

  return { isOk: true };
};

/** Makes a backup of the database now. */
export const backUpNowAction = async (): Promise<DataFolderResult> => {
  if (isDemoMode()) return { isOk: false, code: 'unavailable' };

  try {
    await backUpNow();
  } catch {
    return { isOk: false, code: 'backupFailed' };
  } finally {
    revalidatePath('/settings');
  }

  return { isOk: true };
};

/** Replaces the database with a backup from the data folder. */
export const restoreBackupAction = async (
  name: string
): Promise<DataFolderResult> => {
  if (isDemoMode()) return { isOk: false, code: 'unavailable' };

  const restored = await restoreBackup(name);
  revalidatePath('/', 'layout');

  return restored.isOk
    ? { isOk: true }
    : { isOk: false, code: 'restoreFailed' };
};
