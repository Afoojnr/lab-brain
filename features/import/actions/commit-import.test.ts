import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/experiments/server', () => ({
  createExperiment: vi.fn(),
  createParameterDefinition: vi.fn(),
  createSample: vi.fn(),
  createStudy: vi.fn(),
  getExperimentInProject: vi.fn(),
  getProjectById: vi.fn(),
  listExperimentsByProject: vi.fn(),
  listParameterDefinitions: vi.fn(),
  listSamplesByExperiment: vi.fn(),
  listStudiesByExperiment: vi.fn(),
  updateSample: vi.fn()
}));

import {
  createExperiment,
  createParameterDefinition,
  createSample,
  createStudy,
  getExperimentInProject,
  getProjectById,
  listExperimentsByProject,
  listParameterDefinitions,
  listSamplesByExperiment,
  listStudiesByExperiment,
  updateSample
} from '@/features/experiments/server';

import type { ImportPayload } from '../types';
import { commitImportAction } from './commit-import';

const PAYLOAD: ImportPayload = {
  target: { type: 'new', name: 'Deposition', codePrefix: 'ALD', protocol: '' },
  headers: ['Sample', 'Power (W)', 'Study'],
  mapping: [
    { type: 'code' },
    {
      type: 'newColumn',
      name: 'Power',
      unit: 'W',
      kind: 'number',
      role: 'parameter'
    },
    { type: 'studies' }
  ],
  dateFormat: 'iso',
  rows: [
    {
      sheetRow: 2,
      cells: ['ALD001', '100', 'Pulse'],
      comments: { '1': 'check' }
    },
    { sheetRow: 3, cells: ['ALD002', '', 'Pulse'], comments: {} }
  ],
  choices: {},
  shouldSkipErrorRows: false
};

const calls: string[] = [];

beforeEach(() => {
  calls.length = 0;
  vi.mocked(getProjectById).mockResolvedValue({} as never);
  vi.mocked(listExperimentsByProject).mockResolvedValue([]);
  vi.mocked(listParameterDefinitions).mockResolvedValue([]);
  vi.mocked(listStudiesByExperiment).mockResolvedValue([]);
  vi.mocked(listSamplesByExperiment).mockResolvedValue([]);
  vi.mocked(createExperiment).mockImplementation(async () => {
    calls.push('experiment');
    return { id: 'e-new' } as never;
  });
  vi.mocked(createParameterDefinition).mockImplementation(async () => {
    calls.push('column');
    return { id: 'c-new' } as never;
  });
  vi.mocked(createStudy).mockImplementation(async () => {
    calls.push('study');
    return { id: 's-new' } as never;
  });
  vi.mocked(createSample).mockImplementation(async () => {
    calls.push('sample');
    return {} as never;
  });
  vi.mocked(updateSample).mockImplementation(async () => {
    calls.push('update');
    return {} as never;
  });
});

describe('commitImportAction', () => {
  it('writes the experiment, then columns, studies and samples', async () => {
    const result = await commitImportAction('p1', PAYLOAD);

    expect(result).toMatchObject({
      isOk: true,
      created: 2,
      updated: 0,
      skipped: 0,
      experimentId: 'e-new'
    });
    expect(calls).toEqual([
      'experiment',
      'column',
      'study',
      'sample',
      'sample'
    ]);
    expect(createSample).toHaveBeenNthCalledWith(
      1,
      'e-new',
      expect.objectContaining({
        code: 'ALD001',
        values: { 'c-new': 100 },
        studyIds: ['s-new'],
        note: 'Power (W): check'
      })
    );
    expect(createSample).toHaveBeenNthCalledWith(
      2,
      'e-new',
      expect.objectContaining({ code: 'ALD002', values: {} })
    );
  });

  it('ignores an unknown project', async () => {
    vi.mocked(getProjectById).mockResolvedValue(undefined);

    expect(await commitImportAction('nope', PAYLOAD)).toBeNull();
    expect(calls).toEqual([]);
  });

  it.each([undefined, null, 42, { target: 1 }])(
    'ignores garbage %j',
    async input => {
      expect(await commitImportAction('p1', input)).toBeNull();
      expect(calls).toEqual([]);
    }
  );

  it('ignores an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);

    const result = await commitImportAction('p1', {
      ...PAYLOAD,
      target: { type: 'existing', experimentId: 'other-projects' }
    });

    expect(result).toBeNull();
    expect(calls).toEqual([]);
  });

  it('writes nothing and returns a fresh report when the preview is stale', async () => {
    // The user chose "add as new" as ALD003, which was taken in the meantime.
    vi.mocked(listExperimentsByProject).mockResolvedValue([
      { id: 'e-other', codePrefix: 'PSL' } as never
    ]);
    vi.mocked(listSamplesByExperiment).mockResolvedValue([
      { code: 'ALD001' } as never,
      { code: 'ALD003' } as never
    ]);

    const result = await commitImportAction('p1', {
      ...PAYLOAD,
      choices: { '2': { action: 'addAsNew', code: 'ALD003' } }
    });

    expect(result).toMatchObject({ isOk: false });
    expect(result && !result.isOk && result.report.rows[0]?.issues).toEqual([
      { column: 0, message: 'codeDuplicate' }
    ]);
    expect(calls).toEqual([]);
  });

  it('writes nothing when a prefix is taken, even if the browser said it was free', async () => {
    vi.mocked(listExperimentsByProject).mockResolvedValue([
      { id: 'e-other', codePrefix: 'ALD' } as never
    ]);

    const result = await commitImportAction('p1', PAYLOAD);

    expect(result).toMatchObject({ isOk: false });
    expect(calls).toEqual([]);
  });

  it('updates a chosen conflict without erasing stored values', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue({ id: 'e1' } as never);
    vi.mocked(listParameterDefinitions).mockResolvedValue([
      { id: 'c1', name: 'Power', kind: 'number', role: 'parameter' } as never,
      { id: 'c2', name: 'Time', kind: 'number', role: 'parameter' } as never
    ]);
    vi.mocked(listSamplesByExperiment).mockResolvedValue([
      {
        id: 'sample-1',
        code: 'ALD001',
        performedOn: null,
        values: { c1: 100, c2: 5 },
        implementation: null,
        observation: null,
        note: null,
        studyIds: ['s-old']
      } as never
    ]);

    const result = await commitImportAction('p1', {
      ...PAYLOAD,
      target: { type: 'existing', experimentId: 'e1' },
      mapping: [
        { type: 'code' },
        { type: 'column', columnId: 'c1' },
        { type: 'column', columnId: 'c2' }
      ],
      rows: [{ sheetRow: 2, cells: ['ALD001', '200', ''], comments: {} }],
      choices: { '2': { action: 'update' } }
    });

    expect(result).toMatchObject({ isOk: true, created: 0, updated: 1 });
    expect(updateSample).toHaveBeenCalledWith(
      'e1',
      'sample-1',
      expect.objectContaining({
        values: { c1: 200, c2: 5 },
        studyIds: ['s-old']
      })
    );
  });
});
