import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/studies', () => ({
  getStudyInExperiment: vi.fn(),
  listStudiesByExperiment: vi.fn(),
  updateStudy: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import { getExperimentInProject } from '../data/experiments';
import {
  getStudyInExperiment,
  listStudiesByExperiment,
  updateStudy
} from '../data/studies';
import { updateStudyAction } from './update-study';

const EXPERIMENT = {
  id: 'experiment-1',
  projectId: 'project-1',
  name: 'Deposition',
  codePrefix: 'ALD',
  protocol: null,
  createdAt: new Date()
};
const study = (id: string, name: string) => ({
  id,
  experimentId: 'experiment-1',
  name,
  description: null,
  createdAt: new Date()
});
const PULSE = study('study-1', 'Plasma pulse study');
const TEB = study('study-2', 'TEB study');
const FORM = { name: 'Plasma pulse study', description: 'Free notes' };

const withStoredRecords = () => {
  vi.mocked(getExperimentInProject).mockResolvedValue(EXPERIMENT);
  vi.mocked(getStudyInExperiment).mockResolvedValue(PULSE);
  vi.mocked(listStudiesByExperiment).mockResolvedValue([PULSE, TEB]);
};

const run = (input: unknown) =>
  updateStudyAction('project-1', 'experiment-1', 'study-1', input);

describe('updateStudyAction', () => {
  it('saves the change, refreshes the experiment page and returns true', async () => {
    withStoredRecords();
    vi.mocked(updateStudy).mockResolvedValueOnce(PULSE);

    const result = await run({
      name: '  Plasma pulse study ',
      description: ' Free notes '
    });

    expect(updateStudy).toHaveBeenCalledWith('experiment-1', 'study-1', FORM);
    expect(revalidatePath).toHaveBeenCalledWith(
      '/projects/project-1/experiments/experiment-1'
    );
    expect(result).toBe(true);
  });

  it("does not count the study's own name as a duplicate", async () => {
    withStoredRecords();
    vi.mocked(updateStudy).mockResolvedValueOnce(PULSE);

    expect(await run(FORM)).toBe(true);
  });

  it('ignores a name another study in the experiment already has', async () => {
    withStoredRecords();

    expect(await run({ ...FORM, name: 'teb study' })).toBe(false);
    expect(updateStudy).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, { name: '', description: '' }])(
    'ignores invalid input %j',
    async input => {
      withStoredRecords();

      expect(await run(input)).toBe(false);
      expect(updateStudy).not.toHaveBeenCalled();
    }
  );

  it('ignores a study that is not in the experiment', async () => {
    withStoredRecords();
    vi.mocked(getStudyInExperiment).mockResolvedValueOnce(undefined);

    expect(await run(FORM)).toBe(false);
    expect(updateStudy).not.toHaveBeenCalled();
  });

  it('ignores an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValueOnce(undefined);

    expect(await run(FORM)).toBe(false);
    expect(updateStudy).not.toHaveBeenCalled();
  });
});
