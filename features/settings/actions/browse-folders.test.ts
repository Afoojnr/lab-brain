// @vitest-environment node
import { mkdirSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { writeLocalSettings } from '@/lib/config/local-settings';

import { browseFoldersAction, createFolderAction } from './browse-folders';

const root = mkdtempSync(path.join(tmpdir(), 'lab-brain-browse-'));

beforeAll(() => {
  process.env.LAB_BRAIN_DATA_DIR = path.join(root, 'data');
  process.env.LAB_BRAIN_STORAGE_DIR = '';
});

afterEach(() => {
  delete process.env.LAB_BRAIN_DEMO;
  process.env.LAB_BRAIN_STORAGE_DIR = '';
  writeLocalSettings({ dataFolder: null });
});

describe('browseFoldersAction', () => {
  it('shows a folder with its parent and subfolders', async () => {
    mkdirSync(path.join(root, 'a'));

    const result = await browseFoldersAction(root);

    expect(result).toMatchObject({
      isOk: true,
      path: root,
      parent: path.dirname(root)
    });
    expect(result.isOk && result.folders.map(f => f.name)).toContain('a');
  });

  it('starts at the current data folder, else at the home folder', async () => {
    const chosen = mkdtempSync(path.join(root, 'chosen-'));
    writeLocalSettings({ dataFolder: chosen });
    expect(await browseFoldersAction(null)).toMatchObject({ path: chosen });

    writeLocalSettings({ dataFolder: null });
    expect(await browseFoldersAction(null)).toMatchObject({
      path: path.resolve(os.homedir())
    });
  });

  it('has no parent at the top of the drive', async () => {
    expect(await browseFoldersAction(path.parse(root).root)).toMatchObject({
      isOk: true,
      parent: null
    });
  });

  it('refuses a relative path and a folder that cannot be read', async () => {
    expect(await browseFoldersAction('relative')).toEqual({
      isOk: false,
      reason: 'notAbsolute'
    });
    expect(await browseFoldersAction(path.join(root, 'missing'))).toEqual({
      isOk: false,
      reason: 'cannotRead'
    });
  });

  it('is not available on the demo or when the server fixes the storage folder', async () => {
    process.env.LAB_BRAIN_DEMO = 'true';
    expect(await browseFoldersAction(root)).toEqual({
      isOk: false,
      reason: 'unavailable'
    });
    expect(await createFolderAction(root, 'x')).toEqual({
      isOk: false,
      reason: 'unavailable'
    });
    delete process.env.LAB_BRAIN_DEMO;

    process.env.LAB_BRAIN_STORAGE_DIR = path.join(root, 'fixed');
    expect(await browseFoldersAction(root)).toEqual({
      isOk: false,
      reason: 'unavailable'
    });
  });
});

describe('createFolderAction', () => {
  it('creates a folder, and refuses a name that could leave the parent', async () => {
    expect(await createFolderAction(root, 'New one')).toEqual({
      isOk: true,
      path: path.join(root, 'New one')
    });
    expect(await createFolderAction(root, '../out')).toEqual({
      isOk: false,
      reason: 'invalidName'
    });
  });
});
