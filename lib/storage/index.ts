import path from 'node:path';

import { createLocalStorage } from './local-adapter';
import type { StorageAdapter } from './types';

/**
 * The storage the app uses, on the server only. Files live in the folder named
 * by `LAB_BRAIN_STORAGE_DIR`, or `./storage` next to the app by default.
 */
export const getStorage = (): StorageAdapter =>
  createLocalStorage(
    process.env.LAB_BRAIN_STORAGE_DIR ?? path.join(process.cwd(), 'storage')
  );

export type { StorageAdapter } from './types';
