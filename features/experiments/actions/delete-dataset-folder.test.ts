// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/storage', () => ({ getStorage: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/samples', () => ({ getSampleById: vi.fn() }));
vi.mock('../data/characterizations', () => ({
  getCharacterizationOfSample: vi.fn()
}));
vi.mock('../data/datasets', () => ({
  deleteDataset: vi.fn(),
  listDatasetsByCharacterization: vi.fn()
}));

import { getStorage } from '@/lib/storage';

import { getCharacterizationOfSample } from '../data/characterizations';
import {
  deleteDataset,
  listDatasetsByCharacterization
} from '../data/datasets';
import { getExperimentInProject } from '../data/experiments';
import { getSampleById } from '../data/samples';
import { deleteDatasetFolderAction } from './delete-dataset-folder';

const file = (id: string, folder: string | null) => ({
  id,
  characterizationId: 'record-1',
  folder,
  storagePath: `files/${id}.txt`
});
const storage = { delete: vi.fn() };

const run = (folder = 'ABC130') =>
  deleteDatasetFolderAction(
    'project-1',
    'experiment-1',
    'sample-1',
    'record-1',
    folder
  );

beforeEach(() => {
  vi.mocked(getExperimentInProject).mockResolvedValue({
    id: 'experiment-1'
  } as never);
  vi.mocked(getSampleById).mockResolvedValue({
    id: 'sample-1',
    experimentId: 'experiment-1'
  } as never);
  vi.mocked(getCharacterizationOfSample).mockResolvedValue({
    id: 'record-1'
  } as never);
  vi.mocked(getStorage).mockReturnValue(storage as never);
  vi.mocked(listDatasetsByCharacterization).mockResolvedValue([
    file('a', 'ABC130'),
    file('b', 'ABC130'),
    file('c', 'OTHER'),
    file('d', null)
  ] as never);
});

describe('deleteDatasetFolderAction', () => {
  it('removes every file of that folder from storage and the records, and nothing else', async () => {
    expect(await run()).toBe(2);

    expect(storage.delete.mock.calls).toEqual([
      ['files/a.txt'],
      ['files/b.txt']
    ]);
    expect(vi.mocked(deleteDataset).mock.calls).toEqual([['a'], ['b']]);
  });

  it('removes nothing for a folder that is not there or an empty name', async () => {
    expect(await run('MISSING')).toBeNull();
    expect(await run('')).toBeNull();

    expect(storage.delete).not.toHaveBeenCalled();
    expect(deleteDataset).not.toHaveBeenCalled();
  });

  it('removes nothing when the ids do not belong together', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);
    expect(await run()).toBeNull();

    vi.mocked(getExperimentInProject).mockResolvedValue({
      id: 'experiment-1'
    } as never);
    vi.mocked(getSampleById).mockResolvedValue({
      id: 'sample-1',
      experimentId: 'another'
    } as never);
    expect(await run()).toBeNull();

    vi.mocked(getSampleById).mockResolvedValue({
      id: 'sample-1',
      experimentId: 'experiment-1'
    } as never);
    vi.mocked(getCharacterizationOfSample).mockResolvedValue(undefined);
    expect(await run()).toBeNull();

    expect(storage.delete).not.toHaveBeenCalled();
    expect(deleteDataset).not.toHaveBeenCalled();
  });
});
