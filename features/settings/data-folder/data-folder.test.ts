// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db/client';
import { datasets } from '@/lib/db/schema';
import { createLocalStorage } from '@/lib/storage/local-adapter';

import { inspectFolder } from './inspect-folder';
import { copyFilesToFolder } from './move-files';

const makeFolder = () => mkdtempSync(path.join(tmpdir(), 'lab-brain-folder-'));

describe('inspectFolder', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['relative/path', 'notAbsolute']
  ])('refuses %j', async (typed, reason) => {
    expect(await inspectFolder(typed)).toEqual({ isOk: false, reason });
  });

  it('refuses a folder that does not exist, and does not create it', async () => {
    const missing = path.join(makeFolder(), 'typo');

    expect(await inspectFolder(missing)).toEqual({
      isOk: false,
      reason: 'notFound'
    });
    expect(await createLocalStorage(path.dirname(missing)).list('')).toEqual(
      []
    );
  });

  it('accepts a writable folder, plans a new Lab Brain folder inside it, and creates nothing', async () => {
    const folder = makeFolder();

    expect(await inspectFolder(folder)).toEqual({
      isOk: true,
      chosen: folder,
      folder: path.join(folder, 'Lab Brain'),
      isNew: true,
      hasFiles: false,
      hasBackups: false
    });
    expect(await createLocalStorage(folder).list('')).toEqual([]);
  });

  it('uses a Lab Brain folder that is already there, and says what it holds', async () => {
    const parent = makeFolder();
    const existing = path.join(parent, 'Lab Brain');
    await createLocalStorage(existing).upload(
      'files/a/one.txt',
      new Uint8Array([1])
    );
    mkdirSync(path.join(existing, 'backups'));
    writeFileSync(
      path.join(existing, 'backups', 'lab-brain-pc-2026-01-02_0304.db'),
      'x'
    );

    expect(await inspectFolder(parent)).toMatchObject({
      isOk: true,
      folder: existing,
      isNew: false,
      hasFiles: true,
      hasBackups: true
    });
  });

  it('does not nest another Lab Brain folder when the picked folder is already one', async () => {
    const parent = makeFolder();
    const named = path.join(parent, 'Lab Brain');
    mkdirSync(named);
    const holdsFiles = makeFolder();
    mkdirSync(path.join(holdsFiles, 'files'));

    expect(await inspectFolder(named)).toMatchObject({
      folder: named,
      isNew: false
    });
    expect(await inspectFolder(holdsFiles)).toMatchObject({
      folder: holdsFiles,
      isNew: false
    });
  });
});

describe('copyFilesToFolder', () => {
  let source: string;

  beforeEach(async () => {
    source = makeFolder();
    process.env.LAB_BRAIN_STORAGE_DIR = source;
    const storage = createLocalStorage(source);
    await storage.upload('one.txt', new Uint8Array([1, 2, 3]));
    await storage.upload('nested/two.txt', new Uint8Array([4, 5]));
    await storage.upload('stray/unused.txt', new Uint8Array([6]));
    // Two records use files; the stray one belongs to no record.
    const db = await getDb();
    await db
      .insert(datasets)
      .values(
        ['one.txt', 'nested/two.txt'].map(storagePath => ({
          id: `moved-${storagePath}`,
          characterizationId: 'demo-characterization-1',
          fileName: storagePath,
          folder: null,
          relativePath: null,
          storagePath,
          contentType: 'text/plain',
          sizeBytes: 1,
          uploadedAt: new Date()
        }))
      )
      .onConflictDoNothing();
  });

  afterEach(() => {
    delete process.env.LAB_BRAIN_STORAGE_DIR;
  });

  it('copies the files the records use, with the same paths and bytes, and leaves the originals and unused files', async () => {
    const target = makeFolder();

    expect(await copyFilesToFolder(target)).toEqual({
      isOk: true,
      copied: 2,
      leftBehind: 1
    });

    const copy = createLocalStorage(path.join(target, 'files'));
    expect(await copy.list('')).toEqual(['nested/two.txt', 'one.txt']);
    expect(await copy.download('one.txt')).toEqual(new Uint8Array([1, 2, 3]));
    expect(await createLocalStorage(source).list('')).toHaveLength(3);
  });

  it('refuses when a file is already there, and replaces nothing', async () => {
    const target = makeFolder();
    const existing = createLocalStorage(path.join(target, 'files'));
    await existing.upload('one.txt', new Uint8Array([9]));

    expect(await copyFilesToFolder(target)).toEqual({
      isOk: false,
      reason: 'collision',
      path: 'one.txt'
    });
    expect(await existing.download('one.txt')).toEqual(new Uint8Array([9]));
    expect(await existing.list('')).toEqual(['one.txt']);
  });
});
