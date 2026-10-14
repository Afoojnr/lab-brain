import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * What belongs to this computer, not to the records: where the data folder is
 * and how its last backup went. It is a small file next to the database, so a
 * restored backup never brings another computer's folder path with it.
 */
export type LocalSettings = {
  /** The folder holding the uploaded files and the backups; null means the app's own `./storage`. */
  dataFolder: string | null;
  /** When the last backup finished (ISO date), or null when there is none yet. */
  lastBackupAt: string | null;
  /** Why the last backup failed, or null when it worked. */
  lastBackupError: string | null;
};

const DEFAULTS: LocalSettings = {
  dataFolder: null,
  lastBackupAt: null,
  lastBackupError: null
};

/** Whether this server is the public demo (resets, keeps nothing). */
export const isDemoMode = (): boolean => process.env.LAB_BRAIN_DEMO === 'true';

/** The local folder with the live database and these settings. */
export const getDataDirectory = (): string =>
  process.env.LAB_BRAIN_DATA_DIR ?? path.join(process.cwd(), 'data');

const settingsPath = () => path.join(getDataDirectory(), 'settings.json');

/**
 * The settings of this computer. Missing or unreadable means the defaults, so
 * the app always starts.
 */
export const readLocalSettings = (): LocalSettings => {
  if (isDemoMode()) return DEFAULTS;

  try {
    const stored: Partial<LocalSettings> = JSON.parse(
      readFileSync(settingsPath(), 'utf8')
    );

    return {
      dataFolder:
        typeof stored.dataFolder === 'string' ? stored.dataFolder : null,
      lastBackupAt:
        typeof stored.lastBackupAt === 'string' ? stored.lastBackupAt : null,
      lastBackupError:
        typeof stored.lastBackupError === 'string'
          ? stored.lastBackupError
          : null
    };
  } catch {
    return DEFAULTS;
  }
};

/**
 * Changes some of this computer's settings and keeps the rest.
 *
 * @param changes - The fields to change.
 * @returns The settings after the change.
 */
export const writeLocalSettings = (
  changes: Partial<LocalSettings>
): LocalSettings => {
  const next = { ...readLocalSettings(), ...changes };
  if (isDemoMode()) return next;

  mkdirSync(getDataDirectory(), { recursive: true });
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2));

  return next;
};
