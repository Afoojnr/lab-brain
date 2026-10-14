import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { sql } from 'drizzle-orm';

import {
  readLocalSettings,
  writeLocalSettings
} from '@/lib/config/local-settings';

import { getDatabaseUrl, getDb } from './client';

/** How often the app looks for changes to back up. */
export const BACKUP_INTERVAL_MS = 10 * 60 * 1000;

/** How many backups of one computer are kept. */
export const BACKUPS_KEPT = 30;

export const BACKUPS_FOLDER = 'backups';

export type BackupFile = {
  /** The file name, e.g. `lab-brain-laptop-2026-10-14_1530.db`. */
  name: string;
  /** The computer that made it. */
  computer: string;
  createdAt: Date;
  sizeBytes: number;
};

export const getDatabaseFile = (): string | null => {
  const url = getDatabaseUrl();

  return url.startsWith('file:') ? url.slice('file:'.length) : null;
};

/** This computer's name as it appears in backup file names. */
export const computerName = (): string =>
  os
    .hostname()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'computer';

const pad = (value: number) => String(value).padStart(2, '0');

/** `2026-10-14_1530`, in local time. */
const stamp = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;

export const BACKUP_NAME =
  /^lab-brain-(.+)-(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})\.db$/;

/** The backup a file name describes, or null when it is not one of ours. */
const parseName = (name: string): Omit<BackupFile, 'sizeBytes'> | null => {
  const match = BACKUP_NAME.exec(name);
  if (!match) return null;

  const [, computer, year, month, day, hour, minute] = match;

  return {
    name,
    computer: computer ?? '',
    createdAt: new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    )
  };
};

/**
 * The folder backups are written to: `LAB_BRAIN_BACKUP_DIR` when the server's
 * owner set one (a mounted volume in Docker, where the data folder cannot be
 * chosen in Settings), else the chosen data folder's `backups` folder, else null
 * (nothing is backed up).
 */
export const getBackupFolder = (): string | null => {
  if (process.env.LAB_BRAIN_BACKUP_DIR) return process.env.LAB_BRAIN_BACKUP_DIR;

  const { dataFolder } = readLocalSettings();

  return dataFolder ? path.join(dataFolder, BACKUPS_FOLDER) : null;
};

/**
 * The backups in a backups folder, newest first, from all computers using it.
 */
export const listBackupsIn = async (folder: string): Promise<BackupFile[]> => {
  const names = await readdir(folder).catch(() => [] as string[]);
  const backups: BackupFile[] = [];
  for (const name of names) {
    const parsed = parseName(name);
    if (!parsed) continue;

    const info = await stat(path.join(folder, name)).catch(() => null);
    if (info) backups.push({ ...parsed, sizeBytes: info.size });
  }

  return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

/** Every backup in the chosen data folder, newest first. */
export const listBackups = async (): Promise<BackupFile[]> => {
  const folder = getBackupFolder();

  return folder ? listBackupsIn(folder) : [];
};

/** Removes this computer's oldest backups beyond the number kept. */
const pruneBackups = async (folder: string) => {
  const mine = (await listBackups()).filter(
    backup => backup.computer === computerName()
  );
  for (const old of mine.slice(BACKUPS_KEPT)) {
    await rm(path.join(folder, old.name), { force: true });
  }
};

/**
 * Writes a consistent copy of the database into the data folder's `backups`
 * folder (`VACUUM INTO`, safe while the app is in use) and keeps the last
 * {@link BACKUPS_KEPT} of this computer.
 */
export const backUpNow = async (): Promise<string> => {
  const folder = getBackupFolder();
  if (!folder) throw new Error('No data folder is chosen');

  try {
    await mkdir(folder, { recursive: true });
    const name = `lab-brain-${computerName()}-${stamp(new Date())}.db`;
    const target = path.join(folder, name);
    // VACUUM INTO needs a file that is not there yet (a second backup in the
    // same minute replaces the first).
    await rm(target, { force: true });
    await (await getDb()).run(sql`VACUUM INTO ${target}`);
    await pruneBackups(folder);
    writeLocalSettings({
      lastBackupAt: new Date().toISOString(),
      lastBackupError: null
    });

    return name;
  } catch (error) {
    writeLocalSettings({
      lastBackupError: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

/**
 * Backs up when something changed since the last backup (the database file is
 * newer), and does nothing otherwise or without a data folder.
 */
export const backUpIfChanged = async (): Promise<boolean> => {
  const file = getDatabaseFile();
  if (!file || !getBackupFolder()) return false;

  const { lastBackupAt } = readLocalSettings();
  const changedAt = (await stat(file).catch(() => null))?.mtimeMs ?? 0;
  if (lastBackupAt && changedAt <= new Date(lastBackupAt).getTime()) {
    return false;
  }

  await backUpNow();

  return true;
};

const store = globalThis as { __labBrainBackupTimer?: NodeJS.Timeout };

/**
 * Checks for changes to back up every {@link BACKUP_INTERVAL_MS} while the
 * server runs. A failure is kept in the settings (shown in Settings), never
 * thrown into a page.
 */
export const startAutomaticBackups = (): void => {
  if (store.__labBrainBackupTimer) return;

  store.__labBrainBackupTimer = setInterval(() => {
    backUpIfChanged().catch(() => undefined);
  }, BACKUP_INTERVAL_MS);
  store.__labBrainBackupTimer.unref();
};
