// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createLocalStorage } from './local-adapter';
import type { StorageAdapter } from './types';

let root: string;
let storage: StorageAdapter;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'lab-brain-storage-'));
  storage = createLocalStorage(root);
});
afterEach(() => rm(root, { recursive: true, force: true }));

const bytes = (text: string) => new TextEncoder().encode(text);

describe('local storage', () => {
  it('stores a file, reads it back, lists it and deletes it', async () => {
    await storage.upload('a/b/file.txt', bytes('hello'));

    expect(
      new TextDecoder().decode((await storage.download('a/b/file.txt'))!)
    ).toBe('hello');
    expect(await storage.list('a')).toEqual(['a/b/file.txt']);
    expect(await storage.delete('a/b/file.txt')).toBe(true);
    expect(await storage.download('a/b/file.txt')).toBeNull();
    expect(await storage.delete('a/b/file.txt')).toBe(false);
  });

  it('lists nothing for a folder that does not exist', async () => {
    expect(await storage.list('nope')).toEqual([]);
  });

  it.each([
    '../outside.txt',
    'a/../../outside.txt',
    '/etc/passwd',
    'C:\\x',
    '',
    'a\0b'
  ])('refuses the path %j', async badPath => {
    await expect(storage.upload(badPath, bytes('x'))).rejects.toThrow();
    expect(await storage.download(badPath)).toBeNull();
    expect(await storage.delete(badPath)).toBe(false);
  });
});
