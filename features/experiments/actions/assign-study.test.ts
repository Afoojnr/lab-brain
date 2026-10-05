import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/studies', () => ({ getStudyInExperiment: vi.fn() }));
vi.mock('../data/samples', () => ({ assignSamplesToStudy: vi.fn() }));

import { revalidatePath } from 'next/cache';

import { getStudyInExperiment } from '../data/studies';
import { assignSamplesToStudy } from '../data/samples';
import { getExperimentInProject } from '../data/experiments';
import { assignStudyAction } from './assign-study';

const EXPERIMENT = {
  id: 'experiment-1',
  projectId: 'project-1',
  name: 'Deposition',
  codePrefix: 'ALD',
  protocol: null,
  createdAt: new Date()
};
const STUDY = {
  id: 'study-1',
  experimentId: 'experiment-1',
  name: 'Plasma pulse study',
  description: null,
  createdAt: new Date()
};

const withStoredRecords = () => {
  vi.mocked(getExperimentInProject).mockResolvedValue(EXPERIMENT);
  vi.mocked(getStudyInExperiment).mockResolvedValue(STUDY);
};

describe('assignStudyAction', () => {
  it('tags the samples, refreshes the experiment page and returns how many gained the tag', async () => {
    withStoredRecords();
    vi.mocked(assignSamplesToStudy).mockResolvedValueOnce(2);

    const tagged = await assignStudyAction(
      'project-1',
      'experiment-1',
      'study-1',
      ['sample-1', 'sample-2']
    );

    expect(assignSamplesToStudy).toHaveBeenCalledWith(
      'experiment-1',
      'study-1',
      ['sample-1', 'sample-2']
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      '/projects/project-1/experiments/experiment-1'
    );
    expect(tagged).toBe(2);
  });

  it.each([undefined, 'sample-1', [], [1, 2]])(
    'ignores sample ids %j',
    async sampleIds => {
      withStoredRecords();

      expect(
        await assignStudyAction(
          'project-1',
          'experiment-1',
          'study-1',
          sampleIds
        )
      ).toBeNull();
      expect(assignSamplesToStudy).not.toHaveBeenCalled();
    }
  );

  it('ignores a study that is not in the experiment', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(EXPERIMENT);
    vi.mocked(getStudyInExperiment).mockResolvedValueOnce(undefined);

    expect(
      await assignStudyAction('project-1', 'experiment-1', 'other', ['s'])
    ).toBeNull();
    expect(assignSamplesToStudy).not.toHaveBeenCalled();
  });

  it('ignores an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValueOnce(undefined);

    expect(
      await assignStudyAction('other', 'experiment-1', 'study-1', ['s'])
    ).toBeNull();
    expect(assignSamplesToStudy).not.toHaveBeenCalled();
  });
});
