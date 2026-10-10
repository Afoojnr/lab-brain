import { describe, expect, it } from 'vitest';

import {
  createSavedPlot,
  deleteSavedPlot,
  getSavedPlot,
  listSavedPlots,
  updateSavedPlot
} from './saved-plots';
import { DEFAULT_STYLE } from '../style';

const INPUT = {
  name: 'GPC at 600',
  settings: {
    x: 'a',
    y: 'b',
    error: null,
    group: { type: 'none' as const },
    logX: false,
    logY: false
  },
  filters: [],
  untickedIds: [],
  style: DEFAULT_STYLE
};

describe('saved plots', () => {
  it("lists only the experiment's own plots, oldest first", async () => {
    const first = await createSavedPlot('exp-list', INPUT);
    await createSavedPlot('exp-other', { ...INPUT, name: 'Other' });
    const second = await createSavedPlot('exp-list', {
      ...INPUT,
      name: 'Second'
    });

    expect((await listSavedPlots('exp-list')).map(plot => plot.id)).toEqual([
      first.id,
      second.id
    ]);
  });

  it('never returns, changes or deletes a plot through another experiment', async () => {
    const plot = await createSavedPlot('exp-a', INPUT);

    expect(await getSavedPlot('exp-b', plot.id)).toBeUndefined();
    expect(
      await updateSavedPlot('exp-b', plot.id, { ...INPUT, name: 'X' })
    ).toBeNull();
    expect(await deleteSavedPlot('exp-b', plot.id)).toBe(false);
    expect((await getSavedPlot('exp-a', plot.id))?.name).toBe('GPC at 600');
  });

  it('updates and deletes a plot of the experiment', async () => {
    const plot = await createSavedPlot('exp-c', INPUT);

    await updateSavedPlot('exp-c', plot.id, { ...INPUT, name: 'Renamed' });
    expect((await getSavedPlot('exp-c', plot.id))?.name).toBe('Renamed');
    expect(await deleteSavedPlot('exp-c', plot.id)).toBe(true);
    expect(await listSavedPlots('exp-c')).toEqual([]);
  });
});
