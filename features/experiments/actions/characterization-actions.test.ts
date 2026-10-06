import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/samples', () => ({ getSampleById: vi.fn() }));
vi.mock('../data/characterizations', () => ({
  createCharacterization: vi.fn(),
  updateCharacterization: vi.fn(),
  deleteCharacterization: vi.fn(),
  getCharacterizationOfSample: vi.fn(),
  listTechniquesByProject: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import {
  createCharacterization,
  deleteCharacterization,
  getCharacterizationOfSample,
  listTechniquesByProject,
  updateCharacterization
} from '../data/characterizations';
import { getExperimentInProject } from '../data/experiments';
import { getSampleById } from '../data/samples';
import { createCharacterizationAction } from './create-characterization';
import { deleteCharacterizationAction } from './delete-characterization';
import { updateCharacterizationAction } from './update-characterization';

const EXPERIMENT = {
  id: 'experiment-1',
  projectId: 'project-1',
  name: 'Deposition',
  codePrefix: 'ALD',
  protocol: null,
  createdAt: new Date()
};
const SAMPLE = {
  id: 'sample-1',
  experimentId: 'experiment-1',
  code: 'ALD001',
  performedOn: null,
  values: {},
  implementation: null,
  observation: null,
  note: null,
  studyIds: [],
  createdAt: new Date()
};
const RECORD = {
  id: 'record-1',
  sampleId: 'sample-1',
  technique: 'EDS',
  measuredOn: null,
  note: null,
  createdAt: new Date()
};
const FORM = { technique: '  eds ', measuredOn: '2026-09-15', note: ' Top ' };
const PAGE = '/projects/project-1/experiments/experiment-1';

const withStoredRecords = () => {
  vi.mocked(getExperimentInProject).mockResolvedValue(EXPERIMENT);
  vi.mocked(getSampleById).mockResolvedValue(SAMPLE);
  vi.mocked(getCharacterizationOfSample).mockResolvedValue(RECORD);
  vi.mocked(listTechniquesByProject).mockResolvedValue(['SEM', 'EDS']);
};

describe('createCharacterizationAction', () => {
  const run = (input: unknown) =>
    createCharacterizationAction(
      'project-1',
      'experiment-1',
      'sample-1',
      input
    );

  it("stores the record under the project's spelling and refreshes both pages", async () => {
    withStoredRecords();

    expect(await run(FORM)).toBe(true);

    expect(createCharacterization).toHaveBeenCalledWith('sample-1', {
      technique: 'EDS',
      measuredOn: '2026-09-15',
      note: 'Top'
    });
    expect(revalidatePath).toHaveBeenCalledWith(PAGE);
    expect(revalidatePath).toHaveBeenCalledWith(`${PAGE}/samples/sample-1`);
  });

  it.each([undefined, null, 42, { technique: '', measuredOn: '', note: '' }])(
    'ignores invalid input %j',
    async input => {
      withStoredRecords();

      expect(await run(input)).toBe(false);
      expect(createCharacterization).not.toHaveBeenCalled();
    }
  );

  it('ignores a sample that belongs to another experiment', async () => {
    withStoredRecords();
    vi.mocked(getSampleById).mockResolvedValueOnce({
      ...SAMPLE,
      experimentId: 'experiment-2'
    });

    expect(await run(FORM)).toBe(false);
    expect(createCharacterization).not.toHaveBeenCalled();
  });

  it('ignores an experiment that is not in the project', async () => {
    withStoredRecords();
    vi.mocked(getExperimentInProject).mockResolvedValueOnce(undefined);

    expect(await run(FORM)).toBe(false);
    expect(createCharacterization).not.toHaveBeenCalled();
  });
});

describe('updateCharacterizationAction', () => {
  const run = (input: unknown) =>
    updateCharacterizationAction(
      'project-1',
      'experiment-1',
      'sample-1',
      'record-1',
      input
    );

  it('saves the change under the same spelling rule and returns true', async () => {
    withStoredRecords();
    vi.mocked(updateCharacterization).mockResolvedValueOnce(RECORD);

    expect(await run(FORM)).toBe(true);

    expect(updateCharacterization).toHaveBeenCalledWith(
      'sample-1',
      'record-1',
      { technique: 'EDS', measuredOn: '2026-09-15', note: 'Top' }
    );
    expect(revalidatePath).toHaveBeenCalledWith(`${PAGE}/samples/sample-1`);
  });

  it('ignores a record that does not belong to the sample', async () => {
    withStoredRecords();
    vi.mocked(getCharacterizationOfSample).mockResolvedValueOnce(undefined);

    expect(await run(FORM)).toBe(false);
    expect(updateCharacterization).not.toHaveBeenCalled();
  });

  it.each([undefined, null, { technique: '', measuredOn: '', note: '' }])(
    'ignores invalid input %j',
    async input => {
      withStoredRecords();

      expect(await run(input)).toBe(false);
      expect(updateCharacterization).not.toHaveBeenCalled();
    }
  );
});

describe('deleteCharacterizationAction', () => {
  const run = () =>
    deleteCharacterizationAction(
      'project-1',
      'experiment-1',
      'sample-1',
      'record-1'
    );

  it('removes the record and refreshes both pages', async () => {
    withStoredRecords();
    vi.mocked(deleteCharacterization).mockResolvedValueOnce(true);

    expect(await run()).toBe(true);
    expect(deleteCharacterization).toHaveBeenCalledWith('sample-1', 'record-1');
    expect(revalidatePath).toHaveBeenCalledWith(`${PAGE}/samples/sample-1`);
  });

  it('refreshes nothing when there was no such record', async () => {
    withStoredRecords();
    vi.mocked(deleteCharacterization).mockResolvedValueOnce(false);

    expect(await run()).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('ignores a sample that belongs to another experiment', async () => {
    withStoredRecords();
    vi.mocked(getSampleById).mockResolvedValueOnce({
      ...SAMPLE,
      experimentId: 'experiment-2'
    });

    expect(await run()).toBe(false);
    expect(deleteCharacterization).not.toHaveBeenCalled();
  });
});
