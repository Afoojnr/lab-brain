import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/parameter-definitions', () => ({
  listParameterDefinitions: vi.fn()
}));
vi.mock('../data/studies', () => ({ listStudiesByExperiment: vi.fn() }));
vi.mock('../data/samples', () => ({
  createSample: vi.fn(),
  listSampleCodesByProject: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import { listParameterDefinitions } from '../data/parameter-definitions';
import { createSample, listSampleCodesByProject } from '../data/samples';
import { getExperimentInProject } from '../data/experiments';
import { listStudiesByExperiment } from '../data/studies';
import type { ParameterDefinition } from '../types';
import { createSampleAction } from './create-sample';

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
  defaultValue: null,
  position: 0
};
const VALID_FORM = {
  code: 'ALD003',
  performedOn: '2026-09-04',
  values: { power: '100' },
  studyIds: ['pulse', 'not-this-experiments'],
  implementation: 'Why',
  observation: '',
  note: ' Changed after service '
};
const STORED = {
  id: 'sample-3',
  experimentId: 'experiment-1',
  code: 'ALD003',
  performedOn: '2026-09-04',
  values: { power: 100 },
  note: null,
  implementation: 'Why',
  observation: null,
  derivedFromId: null,
  studyIds: [],
  createdAt: new Date()
};
const PULSE_STUDY = {
  id: 'pulse',
  experimentId: 'experiment-1',
  name: 'Plasma pulse study',
  description: null,
  createdAt: new Date()
};
const PAGE = '/projects/project-1/experiments/experiment-1';

const withStoredExperiment = (codes: string[] = ['ALD001', 'PSL001']) => {
  vi.mocked(getExperimentInProject).mockResolvedValue(EXPERIMENT);
  vi.mocked(listParameterDefinitions).mockResolvedValue([POWER]);
  vi.mocked(listSampleCodesByProject).mockResolvedValue(codes);
  vi.mocked(listStudiesByExperiment).mockResolvedValue([PULSE_STUDY]);
};

describe('createSampleAction', () => {
  it('stores the sample with converted numbers, refreshes the experiment page and returns its id and code', async () => {
    withStoredExperiment();
    vi.mocked(createSample).mockResolvedValueOnce(STORED);

    const result = await createSampleAction(
      'project-1',
      'experiment-1',
      VALID_FORM
    );

    expect(createSample).toHaveBeenCalledWith('experiment-1', {
      code: 'ALD003',
      performedOn: '2026-09-04',
      values: { power: 100 },
      studyIds: ['pulse'],
      implementation: 'Why',
      observation: null,
      note: 'Changed after service'
    });
    expect(revalidatePath).toHaveBeenCalledWith(PAGE);
    expect(result).toEqual({ id: 'sample-3', code: 'ALD003' });
  });

  it('rejects text in a number column on the server, whatever the browser checked', async () => {
    withStoredExperiment();

    const result = await createSampleAction('project-1', 'experiment-1', {
      ...VALID_FORM,
      values: { power: 'high' }
    });

    expect(result).toBeNull();
    expect(createSample).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('validates against the stored columns, so unknown keys are never saved', async () => {
    withStoredExperiment();
    vi.mocked(createSample).mockResolvedValueOnce(STORED);

    await createSampleAction('project-1', 'experiment-1', {
      ...VALID_FORM,
      values: { power: '100', injected: 'x' }
    });

    expect(createSample).toHaveBeenCalledWith(
      'experiment-1',
      expect.objectContaining({ values: { power: 100 } })
    );
  });

  it.each(['ALD001', 'ald001', 'PSL001'])(
    'rejects the code %j, already used in the project (this experiment or another)',
    async code => {
      withStoredExperiment();

      const result = await createSampleAction('project-1', 'experiment-1', {
        ...VALID_FORM,
        code
      });

      expect(result).toBeNull();
      expect(createSample).not.toHaveBeenCalled();
    }
  );

  it('ignores an experiment that belongs to a different project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);

    expect(
      await createSampleAction('another-project', 'experiment-1', VALID_FORM)
    ).toBeNull();
    expect(createSample).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, 'not an object'])(
    'ignores garbage input %j',
    async input => {
      withStoredExperiment();

      expect(
        await createSampleAction('project-1', 'experiment-1', input)
      ).toBeNull();
      expect(createSample).not.toHaveBeenCalled();
    }
  );

  it('lets a storage failure reach the caller and does not refresh the page', async () => {
    withStoredExperiment();
    vi.mocked(createSample).mockRejectedValueOnce(new Error('storage down'));

    await expect(
      createSampleAction('project-1', 'experiment-1', VALID_FORM)
    ).rejects.toThrow('storage down');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
