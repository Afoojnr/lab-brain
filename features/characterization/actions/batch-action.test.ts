import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/experiments/server', () => ({
  createParameterDefinition: vi.fn(),
  getExperimentInProject: vi.fn(),
  listCharacterizationsByExperiment: vi.fn(),
  listDatasetsByCharacterization: vi.fn(),
  listParameterDefinitions: vi.fn(),
  listSamplesByExperiment: vi.fn(),
  updateSample: vi.fn()
}));
vi.mock('../data/analyses', () => ({ saveAnalysis: vi.fn() }));
vi.mock('../load', () => ({ computeAnalysisValues: vi.fn() }));

import {
  createParameterDefinition,
  getExperimentInProject,
  listCharacterizationsByExperiment,
  listDatasetsByCharacterization,
  listParameterDefinitions,
  listSamplesByExperiment,
  updateSample
} from '@/features/experiments/server';

import { saveAnalysis } from '../data/analyses';
import { computeAnalysisValues } from '../load';
import type { AnalysisSettings } from '../types';
import { applyAnalysisBatchAction } from './apply-analysis-batch';

const sample = (id: string, values: Record<string, number> = {}) => ({
  id,
  experimentId: 'experiment-1',
  code: id.toUpperCase(),
  performedOn: null,
  values,
  implementation: null,
  observation: null,
  note: 'kept',
  studyIds: ['study-1']
});
const SAMPLES = [
  sample('s1', { power: 100 }),
  sample('s2', { ratio: 9 }),
  sample('s3')
];
const record = (id: string, sampleId: string) => ({
  id,
  sampleId,
  technique: 'EDX'
});
const RECORDS = [
  record('c1', 's1'),
  record('c2', 's2'),
  record('c3', 's3'),
  record('c4', 's1')
];
const COLUMNS = [
  { id: 'power', name: 'Power', role: 'parameter', kind: 'number' },
  { id: 'ratio', name: 'B/N ratio', role: 'result', kind: 'number' }
];

const settings = (
  overrides: Partial<AnalysisSettings> = {}
): AnalysisSettings => ({
  numerator: 'B',
  denominator: 'N',
  excludedSpots: [],
  datasetId: null,
  selectedValueIds: ['ratio', 'el:B'],
  targets: {
    ratio: { type: 'column', columnId: 'ratio' },
    'el:B': { type: 'new', name: 'Boron', unit: 'at.%' }
  },
  ...overrides
});

beforeEach(() => {
  vi.mocked(getExperimentInProject).mockResolvedValue({
    id: 'experiment-1'
  } as never);
  vi.mocked(listParameterDefinitions).mockResolvedValue(COLUMNS as never);
  vi.mocked(listSamplesByExperiment).mockResolvedValue(SAMPLES as never);
  vi.mocked(listCharacterizationsByExperiment).mockResolvedValue(
    RECORDS as never
  );
  vi.mocked(listDatasetsByCharacterization).mockResolvedValue([]);
  vi.mocked(computeAnalysisValues).mockResolvedValue([
    { id: 'ratio', label: 'B/N', unit: null, value: 1.75 },
    { id: 'el:B', label: 'B', unit: 'at.%', value: 52.5 }
  ]);
  vi.mocked(createParameterDefinition).mockResolvedValue({
    id: 'boron'
  } as never);
});

const row = (characterizationId: string, excludedSpots: string[] = []) => ({
  characterizationId,
  excludedSpots
});
const apply = (
  rows: unknown,
  overrides: Partial<AnalysisSettings> = {},
  kind: unknown = 'edx'
) =>
  applyAnalysisBatchAction('project-1', 'experiment-1', kind, {
    settings: settings(overrides),
    rows
  });

describe('applyAnalysisBatchAction', () => {
  it('updates every row, keeps every other value, and creates a new column once', async () => {
    expect(await apply([row('c1'), row('c2')])).toBe(2);

    expect(createParameterDefinition).toHaveBeenCalledTimes(1);
    expect(updateSample).toHaveBeenCalledTimes(2);
    expect(updateSample).toHaveBeenCalledWith('experiment-1', 's1', {
      code: 'S1',
      performedOn: null,
      values: { power: 100, ratio: 1.75, boron: 52.5 },
      studyIds: ['study-1'],
      implementation: null,
      observation: null,
      note: 'kept'
    });
    expect(updateSample).toHaveBeenCalledWith(
      'experiment-1',
      's2',
      expect.objectContaining({ values: { ratio: 1.75, boron: 52.5 } })
    );
  });

  it('computes every row from its own files with its own spots left out', async () => {
    await apply([row('c1', ['spot-a']), row('c2')]);

    expect(
      vi
        .mocked(computeAnalysisValues)
        .mock.calls.map(call => call[2].excludedSpots)
    ).toEqual([['spot-a'], []]);
  });

  it("saves each row's own settings", async () => {
    await apply([row('c1', ['spot-a']), row('c2')]);

    expect(saveAnalysis).toHaveBeenCalledWith(
      'c1',
      'edx',
      expect.objectContaining({ excludedSpots: ['spot-a'] })
    );
    expect(saveAnalysis).toHaveBeenCalledWith(
      'c2',
      'edx',
      expect.objectContaining({ excludedSpots: [] })
    );
  });

  it('uses the numbers it computed, never numbers from the browser', async () => {
    const forged = {
      settings: { ...settings(), values: { ratio: 999 } },
      rows: [row('c1')],
      value: 999
    };

    await applyAnalysisBatchAction('project-1', 'experiment-1', 'edx', forged);

    expect(vi.mocked(updateSample).mock.calls[0]?.[2].values).toMatchObject({
      ratio: 1.75
    });
  });

  it('writes nothing when a row is not a characterization of this experiment', async () => {
    expect(await apply([row('c1'), row('someone-elses')])).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
    expect(createParameterDefinition).not.toHaveBeenCalled();
  });

  it('refuses two rows of the same sample together', async () => {
    // c1 and c4 are both ALD samples s1: a repeat measurement.
    expect(await apply([row('c1'), row('c4')])).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
  });

  it('writes nothing when one row has nothing to compute from', async () => {
    vi.mocked(computeAnalysisValues)
      .mockResolvedValueOnce([
        { id: 'ratio', label: 'B/N', unit: null, value: 1 },
        { id: 'el:B', label: 'B', unit: 'at.%', value: 50 }
      ])
      .mockResolvedValueOnce(null);

    expect(await apply([row('c1'), row('c2')])).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
    expect(createParameterDefinition).not.toHaveBeenCalled();
  });

  it('writes nothing when a value is missing for one row or is not a finite number', async () => {
    vi.mocked(computeAnalysisValues)
      .mockResolvedValueOnce([
        { id: 'ratio', label: 'B/N', unit: null, value: 1 },
        { id: 'el:B', label: 'B', unit: 'at.%', value: 50 }
      ])
      .mockResolvedValueOnce([
        { id: 'ratio', label: 'B/N', unit: null, value: Number.NaN },
        { id: 'el:B', label: 'B', unit: 'at.%', value: 50 }
      ]);

    expect(await apply([row('c1'), row('c2')])).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a target that is a parameter column',
      { ratio: { type: 'column' as const, columnId: 'power' } }
    ],
    [
      'a column that does not exist',
      { ratio: { type: 'column' as const, columnId: 'nope' } }
    ],
    [
      'a new column whose name is taken',
      { ratio: { type: 'new' as const, name: 'power', unit: '' } }
    ],
    [
      'one column for two values',
      {
        ratio: { type: 'column' as const, columnId: 'ratio' },
        'el:B': { type: 'column' as const, columnId: 'ratio' }
      }
    ]
  ])('writes nothing for %s', async (_name, targets) => {
    expect(
      await apply([row('c1')], {
        targets: { ...settings().targets, ...targets }
      })
    ).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
    expect(createParameterDefinition).not.toHaveBeenCalled();
  });

  it('ignores an experiment that is not in the project, no rows, garbage and an unknown kind', async () => {
    expect(await apply([])).toBeNull();
    expect(await apply([row('c1')], {}, 'xrd')).toBeNull();
    expect(
      await applyAnalysisBatchAction('project-1', 'experiment-1', 'edx', {
        nope: true
      })
    ).toBeNull();

    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);
    expect(await apply([row('c1')])).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
  });
});
