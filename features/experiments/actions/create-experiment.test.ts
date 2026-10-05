import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/projects', () => ({ getProjectById: vi.fn() }));
vi.mock('../data/experiments', () => ({
  createExperiment: vi.fn(),
  listExperimentsByProject: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import { getProjectById } from '../data/projects';
import {
  createExperiment,
  listExperimentsByProject
} from '../data/experiments';
import { createExperimentAction } from './create-experiment';

const PROJECT = {
  id: 'project-1',
  name: 'ALD of BxC',
  description: null,
  createdAt: new Date()
};
const ALD = {
  id: 'experiment-1',
  projectId: 'project-1',
  name: 'Deposition',
  codePrefix: 'ALD',
  protocol: null,
  createdAt: new Date()
};

const withStoredProject = () => {
  vi.mocked(getProjectById).mockResolvedValue(PROJECT);
  vi.mocked(listExperimentsByProject).mockResolvedValue([ALD]);
};

describe('createExperimentAction', () => {
  it('stores a valid experiment, refreshes the project page and returns its id', async () => {
    withStoredProject();
    vi.mocked(createExperiment).mockResolvedValueOnce({
      ...ALD,
      id: 'experiment-2',
      name: 'Paschen law',
      codePrefix: 'PSL'
    });

    const experimentId = await createExperimentAction('project-1', {
      name: '  Paschen law  ',
      codePrefix: 'PSL',
      protocol: '  Measure breakdown voltage at fixed gap.  '
    });

    expect(createExperiment).toHaveBeenCalledWith('project-1', {
      name: 'Paschen law',
      codePrefix: 'PSL',
      protocol: 'Measure breakdown voltage at fixed gap.'
    });
    expect(revalidatePath).toHaveBeenCalledWith('/projects/project-1');
    expect(experimentId).toBe('experiment-2');
  });

  it("ignores a prefix the project's stored experiment already use", async () => {
    withStoredProject();

    const experimentId = await createExperimentAction('project-1', {
      name: 'Another deposition',
      codePrefix: 'ALD',
      protocol: ''
    });

    expect(experimentId).toBeNull();
    expect(createExperiment).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('ignores invalid input', async () => {
    withStoredProject();

    expect(
      await createExperimentAction('project-1', {
        name: '',
        codePrefix: 'x',
        protocol: ''
      })
    ).toBeNull();
    expect(createExperiment).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, 'not an object'])(
    'ignores garbage input %j',
    async input => {
      withStoredProject();

      expect(await createExperimentAction('project-1', input)).toBeNull();
      expect(createExperiment).not.toHaveBeenCalled();
    }
  );

  it('ignores a project that does not exist', async () => {
    vi.mocked(getProjectById).mockResolvedValueOnce(undefined);

    expect(
      await createExperimentAction('missing', {
        name: 'Deposition',
        codePrefix: 'ABC',
        protocol: ''
      })
    ).toBeNull();
    expect(createExperiment).not.toHaveBeenCalled();
  });

  it('lets a storage failure reach the caller and does not refresh the page', async () => {
    withStoredProject();
    vi.mocked(createExperiment).mockRejectedValueOnce(
      new Error('storage down')
    );

    await expect(
      createExperimentAction('project-1', {
        name: 'Paschen law',
        codePrefix: 'PSL',
        protocol: ''
      })
    ).rejects.toThrow('storage down');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
