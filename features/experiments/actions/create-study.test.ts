import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/studies', () => ({
  createStudy: vi.fn(),
  listStudiesByExperiment: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import { createStudy, listStudiesByExperiment } from '../data/studies';
import { getExperimentInProject } from '../data/experiments';
import { createStudyAction } from './create-study';

const EXPERIMENT = {
  id: 'experiment-1',
  projectId: 'project-1',
  name: 'Deposition',
  codePrefix: 'ALD',
  protocol: null,
  createdAt: new Date()
};
const PULSE = {
  id: 'study-1',
  experimentId: 'experiment-1',
  name: 'Plasma pulse study',
  description: null,
  createdAt: new Date()
};

const withStoredExperiment = () => {
  vi.mocked(getExperimentInProject).mockResolvedValue(EXPERIMENT);
  vi.mocked(listStudiesByExperiment).mockResolvedValue([PULSE]);
};

describe('createStudyAction', () => {
  it('stores a valid study, refreshes the experiment page and returns its id', async () => {
    withStoredExperiment();
    vi.mocked(createStudy).mockResolvedValueOnce({
      ...PULSE,
      id: 'study-2'
    });

    const id = await createStudyAction('project-1', 'experiment-1', {
      name: '  TEB study ',
      description: ''
    });

    expect(createStudy).toHaveBeenCalledWith('experiment-1', {
      name: 'TEB study',
      description: ''
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      '/projects/project-1/experiments/experiment-1'
    );
    expect(id).toBe('study-2');
  });

  it("ignores a name the experiment's stored studies already use", async () => {
    withStoredExperiment();

    const id = await createStudyAction('project-1', 'experiment-1', {
      name: 'plasma pulse study',
      description: ''
    });

    expect(id).toBeNull();
    expect(createStudy).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, { name: '', description: '' }])(
    'ignores invalid input %j',
    async input => {
      withStoredExperiment();

      expect(
        await createStudyAction('project-1', 'experiment-1', input)
      ).toBeNull();
      expect(createStudy).not.toHaveBeenCalled();
    }
  );

  it('ignores an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValueOnce(undefined);

    expect(
      await createStudyAction('other-project', 'experiment-1', {
        name: 'TEB study',
        description: ''
      })
    ).toBeNull();
    expect(createStudy).not.toHaveBeenCalled();
  });
});
