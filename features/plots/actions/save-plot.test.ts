import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/experiments/server', () => ({
  getExperimentInProject: vi.fn()
}));
vi.mock('../load-experiment', () => ({ loadExperimentTable: vi.fn() }));
vi.mock('../data/saved-plots', () => ({
  createSavedPlot: vi.fn(),
  listSavedPlots: vi.fn(),
  updateSavedPlot: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import { getExperimentInProject } from '@/features/experiments/server';

import {
  createSavedPlot,
  listSavedPlots,
  updateSavedPlot
} from '../data/saved-plots';
import { loadExperimentTable } from '../load-experiment';
import { DEFAULT_STYLE } from '../style';
import { savePlotAction } from './save-plot';

const INPUT = {
  name: ' GPC at 600 ',
  settings: {
    x: 'temp',
    y: 'thick',
    error: null,
    group: { type: 'none' },
    logX: false,
    logY: false
  },
  filters: [],
  untickedIds: [],
  style: DEFAULT_STYLE
};
const SAVED = {
  id: 'plot-1',
  experimentId: 'exp-1',
  name: 'GPC at 600',
  settings: { ...INPUT.settings, group: { type: 'none' as const } },
  filters: [],
  untickedIds: [],
  style: DEFAULT_STYLE,
  createdAt: new Date()
};

const withStoredExperiment = () => {
  vi.mocked(getExperimentInProject).mockResolvedValue({} as never);
  vi.mocked(loadExperimentTable).mockResolvedValue({
    columns: [
      { key: 'temp', name: 'T', unit: null, kind: 'number' },
      { key: 'thick', name: 'Th', unit: null, kind: 'number' }
    ],
    rows: []
  });
  vi.mocked(listSavedPlots).mockResolvedValue([
    { ...SAVED, id: 'plot-0', name: 'Existing' }
  ]);
};

describe('savePlotAction', () => {
  it('stores a valid plot, refreshes the workspace and returns its id', async () => {
    withStoredExperiment();
    vi.mocked(createSavedPlot).mockResolvedValueOnce(SAVED as never);

    const id = await savePlotAction('project-1', 'exp-1', INPUT);

    expect(createSavedPlot).toHaveBeenCalledWith(
      'exp-1',
      expect.objectContaining({ name: 'GPC at 600' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/plots');
    expect(id).toBe('plot-1');
  });

  it('replaces a saved plot when given its id, allowing it to keep its own title', async () => {
    withStoredExperiment();
    vi.mocked(listSavedPlots).mockResolvedValue([SAVED as never]);
    vi.mocked(updateSavedPlot).mockResolvedValueOnce(SAVED as never);

    expect(await savePlotAction('project-1', 'exp-1', INPUT, 'plot-1')).toBe(
      'plot-1'
    );
    expect(updateSavedPlot).toHaveBeenCalledWith(
      'exp-1',
      'plot-1',
      expect.anything()
    );
  });

  it('ignores a title another plot has, a missing column, and an experiment not in the project', async () => {
    withStoredExperiment();
    vi.mocked(createSavedPlot).mockClear();

    expect(
      await savePlotAction('project-1', 'exp-1', { ...INPUT, name: 'existing' })
    ).toBeNull();
    expect(
      await savePlotAction('project-1', 'exp-1', {
        ...INPUT,
        settings: { ...INPUT.settings, x: 'nope' }
      })
    ).toBeNull();
    vi.mocked(getExperimentInProject).mockResolvedValueOnce(undefined);
    expect(await savePlotAction('project-9', 'exp-1', INPUT)).toBeNull();
    expect(createSavedPlot).not.toHaveBeenCalled();
  });
});
