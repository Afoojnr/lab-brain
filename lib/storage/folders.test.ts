// @vitest-environment node
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createFolder, listFolders } from './local-adapter';

const makeFolder = () => mkdtempSync(path.join(tmpdir(), 'lab-brain-pick-'));

describe('listFolders', () => {
  it('lists only folders, sorted, without hidden ones or file contents', async () => {
    const root = makeFolder();
    mkdirSync(path.join(root, 'Zeta'));
    mkdirSync(path.join(root, 'alpha'));
    mkdirSync(path.join(root, '.hidden'));
    writeFileSync(path.join(root, 'notes.txt'), 'x');

    expect((await listFolders(root))?.map(entry => entry.name)).toEqual([
      'alpha',
      'Zeta'
    ]);
  });

  it('counts a link to a folder as a folder, and returns null for one that cannot be read', async () => {
    const root = makeFolder();
    const real = path.join(root, 'real');
    mkdirSync(real);
    symlinkSync(real, path.join(root, 'link'));

    expect((await listFolders(root))?.map(entry => entry.name)).toEqual([
      'link',
      'real'
    ]);
    expect(await listFolders(path.join(root, 'missing'))).toBeNull();
  });
});

describe('createFolder', () => {
  it('creates one folder inside the parent', async () => {
    const root = makeFolder();

    expect(await createFolder(root, '  Lab Brain  ')).toEqual({
      isOk: true,
      path: path.join(root, 'Lab Brain')
    });
  });

  it.each(['', '  ', '.', '..', 'a/b', 'a\\b', '../escape'])(
    'refuses the name %j, so it can never leave the parent',
    async name => {
      const root = makeFolder();

      expect(await createFolder(root, name)).toEqual({
        isOk: false,
        reason: 'invalidName'
      });
    }
  );

  it('refuses a name that is already taken', async () => {
    const root = makeFolder();
    mkdirSync(path.join(root, 'taken'));

    expect(await createFolder(root, 'taken')).toEqual({
      isOk: false,
      reason: 'exists'
    });
  });
});
