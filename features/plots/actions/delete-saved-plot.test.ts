import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/experiments/server', () => ({
  getExperimentInProject: vi.fn()
}));
vi.mock('../data/saved-plots', () => ({ deleteSavedPlot: vi.fn() }));

import { revalidatePath } from 'next/cache';

import { getExperimentInProject } from '@/features/experiments/server';

import { deleteSavedPlot } from '../data/saved-plots';
import { deleteSavedPlotAction } from './delete-saved-plot';

describe('deleteSavedPlotAction', () => {
  it('removes the plot and refreshes the workspace', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue({} as never);
    vi.mocked(deleteSavedPlot).mockResolvedValue(true);

    expect(await deleteSavedPlotAction('p', 'e', 'plot')).toBe(true);
    expect(deleteSavedPlot).toHaveBeenCalledWith('e', 'plot');
    expect(revalidatePath).toHaveBeenCalledWith('/plots');
  });

  it('does nothing for an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);
    vi.mocked(deleteSavedPlot).mockClear();

    expect(await deleteSavedPlotAction('x', 'e', 'plot')).toBe(false);
    expect(deleteSavedPlot).not.toHaveBeenCalled();
  });
});
