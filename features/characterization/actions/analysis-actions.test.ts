import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/experiments/server', () => ({
  createParameterDefinition: vi.fn(),
  getCharacterizationOfSample: vi.fn(),
  getExperimentInProject: vi.fn(),
  getSampleById: vi.fn(),
  listDatasetsByCharacterization: vi.fn(),
  listParameterDefinitions: vi.fn(),
  updateSample: vi.fn()
}));
vi.mock('../data/analyses', () => ({ saveAnalysis: vi.fn() }));
vi.mock('../load', () => ({ computeAnalysisValues: vi.fn() }));

import {
  createParameterDefinition,
  getCharacterizationOfSample,
  getExperimentInProject,
  getSampleById,
  listDatasetsByCharacterization,
  listParameterDefinitions,
  updateSample
} from '@/features/experiments/server';

import { saveAnalysis } from '../data/analyses';
import { computeAnalysisValues } from '../load';
import type { AnalysisSettings } from '../types';
import { applyAnalysisAction } from './apply-analysis';
import { saveAnalysisSettingsAction } from './save-analysis-settings';

const SAMPLE = {
  id: 'sample-1',
  experimentId: 'experiment-1',
  code: 'ALD001',
  performedOn: '2026-09-01',
  values: { power: 100, ratio: 9 },
  implementation: 'why',
  observation: null,
  note: 'kept',
  studyIds: ['study-1']
};
const column = (id: string, name: string, role: string, kind = 'number') => ({
  id,
  name,
  role,
  kind
});
const COLUMNS = [
  column('power', 'Power', 'parameter'),
  column('ratio', 'B/N ratio', 'result'),
  column('comment', 'Comment', 'result', 'text')
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
  vi.mocked(getSampleById).mockResolvedValue(SAMPLE as never);
  vi.mocked(getCharacterizationOfSample).mockResolvedValue({
    id: 'record-1'
  } as never);
  vi.mocked(listDatasetsByCharacterization).mockResolvedValue([]);
  vi.mocked(listParameterDefinitions).mockResolvedValue(COLUMNS as never);
  vi.mocked(computeAnalysisValues).mockResolvedValue([
    { id: 'ratio', label: 'B/N', unit: null, value: 1.75 },
    { id: 'el:B', label: 'B', unit: 'at.%', value: 52.5 }
  ]);
  vi.mocked(createParameterDefinition).mockResolvedValue({
    id: 'boron'
  } as never);
});

// No default for `input`: a default would swallow the `undefined` the garbage test sends.
const apply = (input: unknown, kind: unknown = 'edx') =>
  applyAnalysisAction(
    'project-1',
    'experiment-1',
    'sample-1',
    'record-1',
    kind,
    input
  );

describe('applyAnalysisAction', () => {
  it('writes the chosen values to existing and new result columns and keeps the rest', async () => {
    expect(await apply(settings())).toBe(2);

    expect(createParameterDefinition).toHaveBeenCalledWith('experiment-1', {
      name: 'Boron',
      unit: 'at.%',
      kind: 'number',
      role: 'result',
      defaultValue: null
    });
    expect(updateSample).toHaveBeenCalledWith('experiment-1', 'sample-1', {
      code: 'ALD001',
      performedOn: '2026-09-01',
      values: { power: 100, ratio: 1.75, boron: 52.5 },
      studyIds: ['study-1'],
      implementation: 'why',
      observation: null,
      note: 'kept'
    });
    expect(saveAnalysis).toHaveBeenCalledWith('record-1', 'edx', settings());
  });

  it('uses the numbers it computed itself, never numbers from the browser', async () => {
    const forged = { ...settings(), values: { ratio: 999 }, value: 999 };

    await apply(forged);

    expect(vi.mocked(updateSample).mock.calls[0]?.[2].values).toMatchObject({
      ratio: 1.75
    });
  });

  it.each([
    [
      'an experiment not in the project',
      () => vi.mocked(getExperimentInProject).mockResolvedValue(undefined)
    ],
    [
      'a sample of another experiment',
      () =>
        vi
          .mocked(getSampleById)
          .mockResolvedValue({ ...SAMPLE, experimentId: 'other' } as never)
    ],
    [
      'a characterization of another sample',
      () => vi.mocked(getCharacterizationOfSample).mockResolvedValue(undefined)
    ]
  ])('ignores %s', async (_name, arrange) => {
    arrange();

    expect(await apply(settings())).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a target that is a parameter column',
      { ratio: { type: 'column' as const, columnId: 'power' } }
    ],
    [
      'a target that is a text result column',
      { ratio: { type: 'column' as const, columnId: 'comment' } }
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
      'a new column without a name',
      { ratio: { type: 'new' as const, name: ' ', unit: '' } }
    ],
    [
      'one column used for two values',
      {
        ratio: { type: 'column' as const, columnId: 'ratio' },
        'el:B': { type: 'column' as const, columnId: 'ratio' }
      }
    ]
  ])('writes nothing for %s', async (_name, targets) => {
    const input = settings({ targets: { ...settings().targets, ...targets } });

    expect(await apply(input)).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
    expect(createParameterDefinition).not.toHaveBeenCalled();
  });

  it('writes nothing for a value the analysis does not produce, or nothing to compute from', async () => {
    expect(await apply(settings({ selectedValueIds: ['ghost'] }))).toBeNull();

    vi.mocked(computeAnalysisValues).mockResolvedValue(null);
    expect(await apply(settings())).toBeNull();
    expect(updateSample).not.toHaveBeenCalled();
  });

  it('writes nothing when no value is chosen', async () => {
    expect(await apply(settings({ selectedValueIds: [] }))).toBeNull();
  });

  it.each([undefined, null, 42, { numerator: 1 }])(
    'ignores garbage settings %j',
    async input => {
      expect(await apply(input)).toBeNull();
    }
  );

  it('ignores an unknown kind of analysis', async () => {
    expect(await apply(settings(), 'xrd')).toBeNull();
  });
});

describe('saveAnalysisSettingsAction', () => {
  const save = (input: unknown) =>
    saveAnalysisSettingsAction(
      'project-1',
      'experiment-1',
      'sample-1',
      'record-1',
      'edx',
      input
    );

  it('saves the settings without touching the sample', async () => {
    expect(await save(settings())).toBe(true);
    expect(saveAnalysis).toHaveBeenCalledWith('record-1', 'edx', settings());
    expect(updateSample).not.toHaveBeenCalled();
  });

  it('ignores garbage and records that do not belong together', async () => {
    expect(await save({ nope: true })).toBe(false);

    vi.mocked(getCharacterizationOfSample).mockResolvedValue(undefined);
    expect(await save(settings())).toBe(false);
    expect(saveAnalysis).not.toHaveBeenCalled();
  });
});
