import { describe, expect, it } from 'vitest';

import { readDroppedEntries } from './read-dropped-entries';

type FakeEntry = Parameters<typeof readDroppedEntries>[0][number];

const file = (name: string): FakeEntry => ({
  isFile: true,
  isDirectory: false,
  name,
  file: success => success(new File(['x'], name))
});

// A directory hands its entries back in batches, then an empty batch.
const directory = (name: string, batches: FakeEntry[][]): FakeEntry => ({
  isFile: false,
  isDirectory: true,
  name,
  createReader: () => {
    let next = 0;
    return {
      readEntries: success => success(batches[next++] ?? [])
    };
  }
});

describe('readDroppedEntries', () => {
  it('walks folders and gives each file its path inside the dropped folder', async () => {
    const dropped = directory('ABC130', [
      [file('Image 1.tiff'), directory('export', [[file('a.csv')]])]
    ]);

    const picked = await readDroppedEntries([dropped]);

    expect(picked.map(item => item.path).sort()).toEqual([
      'ABC130/Image 1.tiff',
      'ABC130/export/a.csv'
    ]);
  });

  it('reads a folder that is returned in several batches', async () => {
    const dropped = directory('F', [[file('a.txt')], [file('b.txt')]]);

    expect(
      (await readDroppedEntries([dropped])).map(item => item.path)
    ).toEqual(['F/a.txt', 'F/b.txt']);
  });

  it('leaves out hidden files such as .DS_Store', async () => {
    const dropped = directory('F', [[file('.DS_Store'), file('a.txt')]]);

    expect(
      (await readDroppedEntries([dropped])).map(item => item.path)
    ).toEqual(['F/a.txt']);
  });

  it('keeps a single dropped file as just its name', async () => {
    expect(
      (await readDroppedEntries([file('one.csv')])).map(item => item.path)
    ).toEqual(['one.csv']);
  });
});
