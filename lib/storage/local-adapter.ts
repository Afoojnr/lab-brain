import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';

import type { StorageAdapter } from './types';

/**
 * Turns a storage path into a real path inside the root, or null when it would
 * leave it (`..`, an absolute path, a NUL byte) so a crafted path can never
 * reach another file on the machine.
 */
const resolveInside = (root: string, relativePath: string): string | null => {
  if (relativePath === '' || relativePath.includes('\0')) return null;
  if (path.isAbsolute(relativePath) || /^[A-Za-z]:/.test(relativePath)) {
    return null;
  }

  const resolved = path.resolve(root, relativePath);
  return resolved.startsWith(path.resolve(root) + path.sep) ? resolved : null;
};

const listFiles = async (folder: string): Promise<string[]> => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(
    () => []
  );
  const nested = await Promise.all(
    entries.map(async entry => {
      const full = path.join(folder, entry.name);
      return entry.isDirectory() ? listFiles(full) : [full];
    })
  );

  return nested.flat();
};

/**
 * Stores files in a folder on this machine. The only file that imports `fs`.
 *
 * @param root - The storage folder; created on the first upload.
 */
export const createLocalStorage = (root: string): StorageAdapter => ({
  upload: async (relativePath, bytes) => {
    const target = resolveInside(root, relativePath);
    if (!target) throw new Error('Invalid storage path');

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  },

  download: async relativePath => {
    const target = resolveInside(root, relativePath);
    if (!target) return null;

    try {
      return new Uint8Array(await readFile(target));
    } catch {
      return null;
    }
  },

  list: async prefix => {
    const folder =
      prefix === '' ? path.resolve(root) : resolveInside(root, prefix);
    if (!folder) return [];

    const files = await listFiles(folder);
    return files
      .map(file =>
        path.relative(path.resolve(root), file).split(path.sep).join('/')
      )
      .sort();
  },

  delete: async relativePath => {
    const target = resolveInside(root, relativePath);
    if (!target) return false;

    const isFile = await stat(target)
      .then(info => info.isFile())
      .catch(() => false);
    if (!isFile) return false;

    await rm(target);
    return true;
  }
});
