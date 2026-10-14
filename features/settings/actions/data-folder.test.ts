// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  readLocalSettings,
  writeLocalSettings
} from '@/lib/config/local-settings';
import { listBackups } from '@/lib/db/backup';

import {
  backUpNowAction,
  checkDataFolderAction,
  setDataFolderAction
} from './data-folder';

const root = mkdtempSync(path.join(tmpdir(), 'lab-brain-actions-'));

beforeAll(() => {
  process.env.LAB_BRAIN_DATA_DIR = path.join(root, 'data');
  process.env.LAB_BRAIN_DATABASE_URL = `file:${path.join(root, 'data', 'lab-brain.db')}`;
  process.env.LAB_BRAIN_STORAGE_DIR = '';
});

afterEach(() => {
  delete process.env.LAB_BRAIN_DEMO;
  process.env.LAB_BRAIN_STORAGE_DIR = '';
  writeLocalSettings({ dataFolder: null });
});

describe('setDataFolderAction', () => {
  it('creates a Lab Brain folder inside the picked one and makes a first backup there', async () => {
    const folder = mkdtempSync(path.join(root, 'ok-'));

    expect(await setDataFolderAction(folder, 'use')).toEqual({ isOk: true });

    const appFolder = path.join(folder, 'Lab Brain');
    expect(readLocalSettings().dataFolder).toBe(appFolder);
    expect(existsSync(path.join(appFolder, 'backups'))).toBe(true);
    expect(await listBackups()).toHaveLength(1);
  });

  it('uses a Lab Brain folder that already exists without replacing anything in it', async () => {
    const folder = mkdtempSync(path.join(root, 'again-'));
    const appFolder = path.join(folder, 'Lab Brain');
    mkdirSync(path.join(appFolder, 'files'), { recursive: true });
    writeFileSync(path.join(appFolder, 'files', 'keep.txt'), 'mine');

    expect(await setDataFolderAction(folder, 'use')).toEqual({ isOk: true });

    expect(readLocalSettings().dataFolder).toBe(appFolder);
    expect(
      readFileSync(path.join(appFolder, 'files', 'keep.txt'), 'utf8')
    ).toBe('mine');
  });

  it('keeps the old folder when the new one is not usable', async () => {
    const old = mkdtempSync(path.join(root, 'old-'));
    writeLocalSettings({ dataFolder: old });

    expect(
      await setDataFolderAction(path.join(root, 'missing'), 'use')
    ).toEqual({ isOk: false, code: 'notFound' });
    expect(readLocalSettings().dataFolder).toBe(old);
  });

  it('cannot be changed on the demo or when the server fixes the storage folder', async () => {
    const folder = mkdtempSync(path.join(root, 'locked-'));

    process.env.LAB_BRAIN_DEMO = 'true';
    expect(await setDataFolderAction(folder, 'use')).toEqual({
      isOk: false,
      code: 'unavailable'
    });
    expect(await checkDataFolderAction(folder)).toEqual({
      isOk: false,
      reason: 'unavailable'
    });
    delete process.env.LAB_BRAIN_DEMO;

    process.env.LAB_BRAIN_STORAGE_DIR = path.join(root, 'fixed');
    expect(await setDataFolderAction(folder, 'use')).toEqual({
      isOk: false,
      code: 'unavailable'
    });
    expect(readLocalSettings().dataFolder).toBeNull();
  });
});

describe('backUpNowAction', () => {
  it('reports a failure instead of throwing when no folder is chosen', async () => {
    expect(await backUpNowAction()).toEqual({
      isOk: false,
      code: 'backupFailed'
    });
  });
});
