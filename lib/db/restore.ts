import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { getDataDirectory } from '@/lib/config/local-settings';

import { BACKUP_NAME, getBackupFolder, getDatabaseFile } from './backup';
import { closeDb } from './client';

export type RestoreResult =
  | { isOk: true; savedAs: string }
  | {
      isOk: false;
      reason: 'noFolder' | 'invalidName' | 'notFound' | 'notLocal';
    };

/** Replaces the database with one of the backups in the data folder. */
export const restoreBackup = async (name: string): Promise<RestoreResult> => {
  const folder = getBackupFolder();
  const database = getDatabaseFile();
  if (!folder) return { isOk: false, reason: 'noFolder' };
  if (!database) return { isOk: false, reason: 'notLocal' };
  if (!BACKUP_NAME.test(name)) return { isOk: false, reason: 'invalidName' };

  const source = path.join(folder, name);
  const kept = path.join(
    getDataDirectory(),
    'before-restore',
    `lab-brain-before-restore-${Date.now()}.db`
  );
  await mkdir(path.dirname(kept), { recursive: true });

  await closeDb();
  try {
    await copyFile(database, kept).catch(() => undefined);
    await copyFile(source, database);
  } catch {
    return { isOk: false, reason: 'notFound' };
  }
  // Leftovers of the old database would be read as part of the new one.
  await rm(`${database}-wal`, { force: true });
  await rm(`${database}-shm`, { force: true });

  return { isOk: true, savedAs: kept };
};
