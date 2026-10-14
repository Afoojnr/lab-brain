import path from 'node:path';

import { isDemoMode, readLocalSettings } from '@/lib/config/local-settings';

import { createLocalStorage } from './local-adapter';
import type { StorageAdapter } from './types';

/** The folder name holding the uploaded files inside a chosen data folder. */
export const FILES_FOLDER = 'files';

/**
 * Where uploaded files live, in this order: `LAB_BRAIN_STORAGE_DIR`; the demo's
 * temporary folder; the `files` folder inside the data folder chosen in
 * Settings; `./storage` next to the app.
 */
export const getStorageRoot = (): string => {
  if (process.env.LAB_BRAIN_STORAGE_DIR) {
    return process.env.LAB_BRAIN_STORAGE_DIR;
  }
  if (isDemoMode()) return '/tmp/lab-brain-storage';

  const { dataFolder } = readLocalSettings();
  if (dataFolder) return path.join(dataFolder, FILES_FOLDER);

  return path.join(process.cwd(), 'storage');
};

/**
 * The storage the app uses, on the server only.
 */
export const getStorage = (): StorageAdapter =>
  createLocalStorage(getStorageRoot());

export type { StorageAdapter } from './types';
