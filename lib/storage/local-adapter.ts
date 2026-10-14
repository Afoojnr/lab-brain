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

/** Stores files in a folder on this machine. */
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

/** Whether a path on this computer is an existing folder. */
export const folderExists = async (folder: string): Promise<boolean> =>
  stat(folder)
    .then(info => info.isDirectory())
    .catch(() => false);

export type FolderEntry = { name: string; path: string };

/**
 * The folders directly inside a folder, for a folder picker: names only, never
 * file contents.
 */
export const listFolders = async (
  folder: string
): Promise<FolderEntry[] | null> => {
  const entries = await readdir(folder, { withFileTypes: true }).catch(
    () => null
  );
  if (!entries) return null;

  const found: FolderEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const full = path.join(folder, entry.name);
    // A link to a folder counts as a folder.
    const isFolder =
      entry.isDirectory() ||
      (entry.isSymbolicLink() && (await folderExists(full)));
    if (isFolder) found.push({ name: entry.name, path: full });
  }

  return found.sort((a, b) => a.name.localeCompare(b.name));
};

export type CreateFolderResult =
  | { isOk: true; path: string }
  | { isOk: false; reason: 'invalidName' | 'exists' | 'cannotCreate' };

/**
 * Creates one new folder inside an existing one. The name must be a single
 * folder name: no separators and no `.` or `..`.
 */
export const createFolder = async (
  parent: string,
  name: string
): Promise<CreateFolderResult> => {
  const trimmed = name.trim();
  const isInvalid =
    trimmed === '' ||
    trimmed === '.' ||
    trimmed === '..' ||
    trimmed.length > 200 ||
    /[\\/\0]/.test(trimmed);
  if (isInvalid) return { isOk: false, reason: 'invalidName' };

  const target = path.join(parent, trimmed);
  try {
    await mkdir(target);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    return {
      isOk: false,
      reason: code === 'EEXIST' ? 'exists' : 'cannotCreate'
    };
  }

  return { isOk: true, path: target };
};
