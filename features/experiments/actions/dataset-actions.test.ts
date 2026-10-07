// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/storage', () => ({ getStorage: vi.fn() }));
vi.mock('../data/projects', () => ({ getProjectById: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/samples', () => ({ getSampleById: vi.fn() }));
vi.mock('../data/characterizations', () => ({
  getCharacterizationOfSample: vi.fn()
}));
vi.mock('../data/datasets', () => ({
  createDataset: vi.fn(),
  deleteDataset: vi.fn(),
  getDatasetById: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import { getStorage } from '@/lib/storage';

import { getCharacterizationOfSample } from '../data/characterizations';
import { createDataset, deleteDataset, getDatasetById } from '../data/datasets';
import { getExperimentInProject } from '../data/experiments';
import { getProjectById } from '../data/projects';
import { getSampleById } from '../data/samples';
import { MAX_DATASET_BYTES } from '../datasets';
import { deleteDatasetAction } from './delete-dataset';
import { uploadDatasetAction } from './upload-dataset';

const PROJECT = { id: 'project-1', name: 'Alpha' };
const EXPERIMENT = {
  id: 'experiment-1',
  projectId: 'project-1',
  codePrefix: 'ALD'
};
const SAMPLE = { id: 'sample-1', experimentId: 'experiment-1', code: 'ALD001' };
const RECORD = {
  id: 'record-1',
  sampleId: 'sample-1',
  technique: 'EDX',
  measuredOn: '2026-09-14'
};

const storage = {
  upload: vi.fn(),
  list: vi.fn(),
  delete: vi.fn()
};

beforeEach(() => {
  vi.mocked(getProjectById).mockResolvedValue(PROJECT as never);
  vi.mocked(getExperimentInProject).mockResolvedValue(EXPERIMENT as never);
  vi.mocked(getSampleById).mockResolvedValue(SAMPLE as never);
  vi.mocked(getCharacterizationOfSample).mockResolvedValue(RECORD as never);
  vi.mocked(getStorage).mockReturnValue(storage as never);
  storage.list.mockResolvedValue([]);
  vi.mocked(createDataset).mockResolvedValue({ id: 'dataset-1' } as never);
});

const formWith = (file: File | string | null) => {
  const form = new FormData();
  if (file !== null) form.set('file', file);
  return form;
};
const FILE = new File(['hello'], 'spectrum.txt', { type: 'text/plain' });

describe('uploadDatasetAction', () => {
  const run = (form: FormData) =>
    uploadDatasetAction(
      'project-1',
      'experiment-1',
      'sample-1',
      'record-1',
      form
    );

  it('writes the file under project/experiment/sample/technique, then records it', async () => {
    expect(await run(formWith(FILE))).toBe('dataset-1');

    expect(storage.upload).toHaveBeenCalledWith(
      'Alpha/ALD/ALD001/EDX/2026-09-14_spectrum.txt',
      expect.any(Uint8Array)
    );
    expect(createDataset).toHaveBeenCalledWith('record-1', {
      fileName: 'spectrum.txt',
      storagePath: 'Alpha/ALD/ALD001/EDX/2026-09-14_spectrum.txt',
      contentType: 'text/plain',
      sizeBytes: 5
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      '/projects/project-1/experiments/experiment-1/samples/sample-1'
    );
  });

  it('does not replace a file already stored under that name', async () => {
    storage.list.mockResolvedValue([
      'Alpha/ALD/ALD001/EDX/2026-09-14_spectrum.txt'
    ]);

    await run(formWith(FILE));

    expect(storage.upload.mock.calls[0]?.[0]).toBe(
      'Alpha/ALD/ALD001/EDX/2026-09-14_spectrum-2.txt'
    );
  });

  it('takes the content type from the extension, not from the browser', async () => {
    const lying = new File(['x'], 'page.html', { type: 'image/png' });

    await run(formWith(lying));

    expect(vi.mocked(createDataset).mock.calls[0]?.[1].contentType).toBe(
      'application/octet-stream'
    );
  });

  it.each([null, 'not a file'])(
    'ignores a missing or non-file value %j',
    async value => {
      expect(await run(formWith(value))).toBeNull();
      expect(storage.upload).not.toHaveBeenCalled();
    }
  );

  it('ignores an empty file', async () => {
    expect(await run(formWith(new File([], 'empty.txt')))).toBeNull();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('refuses a file over the size limit and writes nothing', async () => {
    const big = new File(['x'], 'big.bin');
    Object.defineProperty(big, 'size', { value: MAX_DATASET_BYTES + 1 });

    expect(await run(formWith(big))).toBeNull();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(createDataset).not.toHaveBeenCalled();
  });

  it('ignores an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);

    expect(await run(formWith(FILE))).toBeNull();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('ignores a sample from another experiment', async () => {
    vi.mocked(getSampleById).mockResolvedValue({
      ...SAMPLE,
      experimentId: 'experiment-2'
    } as never);

    expect(await run(formWith(FILE))).toBeNull();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('ignores a characterization that belongs to another sample', async () => {
    vi.mocked(getCharacterizationOfSample).mockResolvedValue(undefined);

    expect(await run(formWith(FILE))).toBeNull();
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe('deleteDatasetAction', () => {
  const run = () =>
    deleteDatasetAction(
      'project-1',
      'experiment-1',
      'sample-1',
      'record-1',
      'dataset-1'
    );

  it('removes the file from storage, then its record', async () => {
    vi.mocked(getDatasetById).mockResolvedValue({
      id: 'dataset-1',
      characterizationId: 'record-1',
      storagePath: 'a/b.txt'
    } as never);

    expect(await run()).toBe(true);
    expect(storage.delete).toHaveBeenCalledWith('a/b.txt');
    expect(deleteDataset).toHaveBeenCalledWith('dataset-1');
  });

  it('ignores a file attached to a different characterization', async () => {
    vi.mocked(getDatasetById).mockResolvedValue({
      id: 'dataset-1',
      characterizationId: 'another-record',
      storagePath: 'a/b.txt'
    } as never);

    expect(await run()).toBe(false);
    expect(storage.delete).not.toHaveBeenCalled();
    expect(deleteDataset).not.toHaveBeenCalled();
  });

  it('ignores an unknown file', async () => {
    vi.mocked(getDatasetById).mockResolvedValue(undefined);

    expect(await run()).toBe(false);
    expect(deleteDataset).not.toHaveBeenCalled();
  });

  it('ignores an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);

    expect(await run()).toBe(false);
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
