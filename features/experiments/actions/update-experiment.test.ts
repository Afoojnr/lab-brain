import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/experiments', () => ({
  getExperimentInProject: vi.fn(),
  listExperimentsByProject: vi.fn(),
  updateExperiment: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import {
  getExperimentInProject,
  listExperimentsByProject,
  updateExperiment
} from '../data/experiments';
import { updateExperimentAction } from './update-experiment';

const experiment = (id: string, codePrefix: string) => ({
  id,
  projectId: 'project-1',
  name: `Experiment ${codePrefix}`,
  codePrefix,
  protocol: null,
  createdAt: new Date()
});
const ALD = experiment('experiment-1', 'ALD');
const PSL = experiment('experiment-2', 'PSL');
const FORM = { name: 'Deposition', codePrefix: 'ALD', protocol: 'Base method' };

const withStoredExperiment = () => {
  vi.mocked(getExperimentInProject).mockResolvedValue(ALD);
  vi.mocked(listExperimentsByProject).mockResolvedValue([ALD, PSL]);
};

describe('updateExperimentAction', () => {
  it('saves the change, refreshes the project and experiment pages and returns true', async () => {
    withStoredExperiment();
    vi.mocked(updateExperiment).mockResolvedValueOnce(ALD);

    const result = await updateExperimentAction('project-1', 'experiment-1', {
      ...FORM,
      name: '  Deposition '
    });

    expect(updateExperiment).toHaveBeenCalledWith('experiment-1', FORM);
    expect(revalidatePath).toHaveBeenCalledWith('/projects/project-1');
    expect(revalidatePath).toHaveBeenCalledWith(
      '/projects/project-1/experiments/experiment-1'
    );
    expect(result).toBe(true);
  });

  it("does not count the experiment's own prefix as a duplicate", async () => {
    withStoredExperiment();
    vi.mocked(updateExperiment).mockResolvedValueOnce(ALD);

    expect(
      await updateExperimentAction('project-1', 'experiment-1', FORM)
    ).toBe(true);
  });

  it('ignores a prefix another experiment in the project already uses', async () => {
    withStoredExperiment();

    const result = await updateExperimentAction('project-1', 'experiment-1', {
      ...FORM,
      codePrefix: 'PSL'
    });

    expect(result).toBe(false);
    expect(updateExperiment).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, { name: '', codePrefix: 'x', protocol: '' }])(
    'ignores invalid input %j',
    async input => {
      withStoredExperiment();

      expect(
        await updateExperimentAction('project-1', 'experiment-1', input)
      ).toBe(false);
      expect(updateExperiment).not.toHaveBeenCalled();
    }
  );

  it('ignores an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValueOnce(undefined);

    expect(await updateExperimentAction('other', 'experiment-1', FORM)).toBe(
      false
    );
    expect(updateExperiment).not.toHaveBeenCalled();
  });
});
