// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/characterization/server', () => ({
  deleteAnalysesOf: vi.fn()
}));
vi.mock('@/features/plots/server', () => ({ deleteSavedPlotsOf: vi.fn() }));
vi.mock('@/features/references/server', () => ({
  deleteReferencesOf: vi.fn()
}));
vi.mock('@/features/experiments/server', () => ({
  getExperimentInProject: vi.fn(),
  getProjectById: vi.fn(),
  removeExperiment: vi.fn(),
  removeProject: vi.fn(),
  removeSample: vi.fn(),
  revalidateNavigation: vi.fn()
}));

import { deleteAnalysesOf } from '@/features/characterization/server';
import {
  getExperimentInProject,
  getProjectById,
  removeExperiment,
  removeProject,
  removeSample,
  revalidateNavigation
} from '@/features/experiments/server';
import { deleteSavedPlotsOf } from '@/features/plots/server';
import { deleteReferencesOf } from '@/features/references/server';

import {
  deleteExperimentAction,
  deleteProjectAction,
  deleteSampleAction
} from './delete-records';

const REMOVED = {
  characterizationIds: ['c1', 'c2'],
  experimentIds: ['e1', 'e2'],
  sampleCount: 3,
  fileCount: 5
};

beforeEach(() => {
  vi.mocked(getExperimentInProject).mockResolvedValue({
    id: 'e1',
    name: 'Deposition'
  } as never);
  vi.mocked(getProjectById).mockResolvedValue({
    id: 'p1',
    name: 'ALD of BxC'
  } as never);
  vi.mocked(removeSample).mockResolvedValue(REMOVED);
  vi.mocked(removeExperiment).mockResolvedValue(REMOVED);
  vi.mocked(removeProject).mockResolvedValue(REMOVED);
});

describe('deleteSampleAction', () => {
  it('removes the sample, then the analyses saved for its measurements', async () => {
    expect(await deleteSampleAction('p1', 'e1', 's1')).toBe(true);

    expect(removeSample).toHaveBeenCalledWith('e1', 's1');
    expect(deleteAnalysesOf).toHaveBeenCalledWith(['c1', 'c2']);
  });

  it('does nothing for an experiment of another project or a sample that is not there', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);
    expect(await deleteSampleAction('p1', 'e1', 's1')).toBe(false);
    expect(removeSample).not.toHaveBeenCalled();

    vi.mocked(getExperimentInProject).mockResolvedValue({ id: 'e1' } as never);
    vi.mocked(removeSample).mockResolvedValue(null);
    expect(await deleteSampleAction('p1', 'e1', 's1')).toBe(false);
    expect(deleteAnalysesOf).not.toHaveBeenCalled();
  });
});

describe('deleteExperimentAction', () => {
  it('needs the exact name, checked on the server, and deletes nothing without it', async () => {
    for (const typed of ['', 'deposition', 'Deposition 2', 'Depo']) {
      expect(await deleteExperimentAction('p1', 'e1', typed)).toBe(false);
    }

    expect(removeExperiment).not.toHaveBeenCalled();
  });

  it('removes the experiment, then its analyses and saved plots, and refreshes the sidebar', async () => {
    expect(await deleteExperimentAction('p1', 'e1', '  Deposition ')).toBe(
      true
    );

    expect(removeExperiment).toHaveBeenCalledWith('p1', 'e1');
    expect(deleteAnalysesOf).toHaveBeenCalledWith(['c1', 'c2']);
    expect(deleteSavedPlotsOf).toHaveBeenCalledWith('e1');
    expect(revalidateNavigation).toHaveBeenCalled();
  });

  it('does nothing for an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);

    expect(await deleteExperimentAction('p1', 'e1', 'Deposition')).toBe(false);
    expect(removeExperiment).not.toHaveBeenCalled();
  });
});

describe('deleteProjectAction', () => {
  it('needs the exact name, checked on the server, and deletes nothing without it', async () => {
    for (const typed of ['', 'ald of bxc', 'ALD']) {
      expect(await deleteProjectAction('p1', typed)).toBe(false);
    }

    expect(removeProject).not.toHaveBeenCalled();
  });

  it("removes the project, then analyses, every experiment's saved plots and the references", async () => {
    expect(await deleteProjectAction('p1', 'ALD of BxC')).toBe(true);

    expect(removeProject).toHaveBeenCalledWith('p1');
    expect(deleteAnalysesOf).toHaveBeenCalledWith(['c1', 'c2']);
    expect(vi.mocked(deleteSavedPlotsOf).mock.calls).toEqual([['e1'], ['e2']]);
    expect(deleteReferencesOf).toHaveBeenCalledWith('p1');
    expect(revalidateNavigation).toHaveBeenCalled();
  });

  it('does nothing for a project that is not there', async () => {
    vi.mocked(getProjectById).mockResolvedValue(undefined);

    expect(await deleteProjectAction('p1', 'ALD of BxC')).toBe(false);
    expect(deleteReferencesOf).not.toHaveBeenCalled();
  });
});
