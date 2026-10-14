'use server';

import os from 'node:os';
import path from 'node:path';

import { isDemoMode, readLocalSettings } from '@/lib/config/local-settings';
import {
  createFolder,
  folderExists,
  listFolders
} from '@/lib/storage/local-adapter';
import type { FolderEntry } from '@/lib/storage/local-adapter';

export type BrowseResult =
  | {
      isOk: true;
      /** The folder being shown. */
      path: string;
      /** The folder above it, or null at the top. */
      parent: string | null;
      folders: FolderEntry[];
    }
  | { isOk: false; reason: 'unavailable' | 'notAbsolute' | 'cannotRead' };

export type NewFolderResult =
  | { isOk: true; path: string }
  | {
      isOk: false;
      reason:
        | 'unavailable'
        | 'notAbsolute'
        | 'invalidName'
        | 'exists'
        | 'cannotCreate';
    };

/** Browsing is for a self-hosted install on the user's own computer. */
const isAvailable = () => !isDemoMode() && !process.env.LAB_BRAIN_STORAGE_DIR;

/**
 * The folders inside a folder, so the user can pick the data folder by clicking
 * instead of typing a path. Names only, never file contents.
 */
export const browseFoldersAction = async (
  requested: string | null
): Promise<BrowseResult> => {
  if (!isAvailable()) return { isOk: false, reason: 'unavailable' };

  const saved = readLocalSettings().dataFolder;
  const start =
    requested ?? (saved && (await folderExists(saved)) ? saved : os.homedir());
  if (!path.isAbsolute(start)) return { isOk: false, reason: 'notAbsolute' };

  const folder = path.resolve(start);
  const folders = await listFolders(folder);
  if (!folders) return { isOk: false, reason: 'cannotRead' };

  const parent = path.dirname(folder);

  return {
    isOk: true,
    path: folder,
    parent: parent === folder ? null : parent,
    folders
  };
};

/** Creates a new folder inside the one being browsed. */
export const createFolderAction = async (
  parent: string,
  name: string
): Promise<NewFolderResult> => {
  if (!isAvailable()) return { isOk: false, reason: 'unavailable' };
  if (!path.isAbsolute(parent)) return { isOk: false, reason: 'notAbsolute' };

  return createFolder(path.resolve(parent), name);
};
