import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/parameter-definitions', () => ({
  listParameterDefinitions: vi.fn()
}));
vi.mock('../data/studies', () => ({ listStudiesByExperiment: vi.fn() }));
vi.mock('../data/samples', () => ({
  getSampleById: vi.fn(),
  listSampleCodesByProject: vi.fn(),
  updateSample: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import { listParameterDefinitions } from '../data/parameter-definitions';
import {
  getSampleById,
  listSampleCodesByProject,
  updateSample
} from '../data/samples';
import { getExperimentInProject } from '../data/experiments';
import { listStudiesByExperiment } from '../data/studies';
import type { ParameterDefinition, Sample } from '../types';
import { updateSampleAction } from './update-sample';

const EXPERIMENT = {
  id: 'experiment-1',
  projectId: 'project-1',
  name: 'Deposition',
  codePrefix: 'ALD',
  protocol: null,
  createdAt: new Date()
};
const POWER: ParameterDefinition = {
  id: 'power',
  experimentId: 'experiment-1',
  name: 'Power',
  unit: 'W',
  kind: 'number',
  role: 'parameter',
  defaultValue: null,
  position: 0
};
const CURRENT: Sample = {
  id: 'sample-2',
  experimentId: 'experiment-1',
  code: 'ALD002',
  performedOn: null,
  values: { power: 100 },
  note: null,
  implementation: null,
  observation: null,
  studyIds: [],
  createdAt: new Date()
};
const FORM = {
  code: 'ALD002',
  performedOn: '',
  values: { power: '120' },
  studyIds: ['pulse', 'not-this-experiments'],
  implementation: '',
  observation: 'Looks uniform',
  note: 'Raised after the check'
};

const PULSE_STUDY = {
  id: 'pulse',
  experimentId: 'experiment-1',
  name: 'Plasma pulse study',
  description: null,
  createdAt: new Date()
};
const withStoredSample = () => {
  vi.mocked(getExperimentInProject).mockResolvedValue(EXPERIMENT);
  vi.mocked(getSampleById).mockResolvedValue(CURRENT);
  vi.mocked(listParameterDefinitions).mockResolvedValue([POWER]);
  vi.mocked(listStudiesByExperiment).mockResolvedValue([PULSE_STUDY]);
  vi.mocked(listSampleCodesByProject).mockResolvedValue([
    'ALD001',
    'ALD002',
    'PSL001'
  ]);
};

describe('updateSampleAction', () => {
  it('saves the change, refreshes both pages and returns the sample', async () => {
    withStoredSample();
    vi.mocked(updateSample).mockResolvedValueOnce({
      ...CURRENT,
      values: { power: 120 }
    });

    const result = await updateSampleAction(
      'project-1',
      'experiment-1',
      'sample-2',
      FORM
    );

    expect(updateSample).toHaveBeenCalledWith('experiment-1', 'sample-2', {
      code: 'ALD002',
      performedOn: null,
      values: { power: 120 },
      studyIds: ['pulse'],
      implementation: null,
      observation: 'Looks uniform',
      note: 'Raised after the check'
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      '/projects/project-1/experiments/experiment-1'
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      '/projects/project-1/experiments/experiment-1/samples/sample-2'
    );
    expect(result).toEqual({ id: 'sample-2', code: 'ALD002' });
  });

  it("lets a sample keep its own code, but not take another sample's", async () => {
    withStoredSample();
    vi.mocked(updateSample).mockResolvedValue(CURRENT);

    expect(
      await updateSampleAction('project-1', 'experiment-1', 'sample-2', FORM)
    ).not.toBeNull();
    expect(
      await updateSampleAction('project-1', 'experiment-1', 'sample-2', {
        ...FORM,
        code: 'PSL001'
      })
    ).toBeNull();
  });

  it('rejects text in a number column, on the server', async () => {
    withStoredSample();

    expect(
      await updateSampleAction('project-1', 'experiment-1', 'sample-2', {
        ...FORM,
        values: { power: 'lots' }
      })
    ).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
  });

  it('ignores a sample that belongs to a different experiment', async () => {
    withStoredSample();
    vi.mocked(getSampleById).mockResolvedValue({
      ...CURRENT,
      experimentId: 'experiment-9'
    });

    expect(
      await updateSampleAction('project-1', 'experiment-1', 'sample-2', FORM)
    ).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
  });

  it('ignores an experiment that belongs to a different project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);

    expect(
      await updateSampleAction(
        'another-project',
        'experiment-1',
        'sample-2',
        FORM
      )
    ).toBeNull();
  });

  it('returns null and refreshes nothing when the sample vanished', async () => {
    withStoredSample();
    vi.mocked(updateSample).mockResolvedValueOnce(undefined);

    expect(
      await updateSampleAction('project-1', 'experiment-1', 'sample-2', FORM)
    ).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, 'not an object'])(
    'ignores garbage input %j',
    async input => {
      withStoredSample();

      expect(
        await updateSampleAction('project-1', 'experiment-1', 'sample-2', input)
      ).toBeNull();
      expect(updateSample).not.toHaveBeenCalled();
    }
  );

  it('lets a storage failure reach the caller and does not refresh the pages', async () => {
    withStoredSample();
    vi.mocked(updateSample).mockRejectedValueOnce(new Error('storage down'));

    await expect(
      updateSampleAction('project-1', 'experiment-1', 'sample-2', FORM)
    ).rejects.toThrow('storage down');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
