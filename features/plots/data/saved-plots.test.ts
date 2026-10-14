import { describe, expect, it } from 'vitest';

import {
  createSavedPlot,
  deleteSavedPlot,
  getSavedPlot,
  listSavedPlots,
  updateSavedPlot
} from './saved-plots';
import { DEFAULT_STYLE } from '../style/style';

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
    const first = await createSavedPlot('demo-experiment-1', INPUT);
    await createSavedPlot('demo-experiment-2', { ...INPUT, name: 'Other' });
    const second = await createSavedPlot('demo-experiment-1', {
      ...INPUT,
      name: 'Second'
    });

    expect(
      (await listSavedPlots('demo-experiment-1')).map(plot => plot.id)
    ).toEqual([first.id, second.id]);
  });

  it('never returns, changes or deletes a plot through another experiment', async () => {
    const plot = await createSavedPlot('demo-experiment-1', INPUT);

    expect(await getSavedPlot('demo-experiment-2', plot.id)).toBeUndefined();
    expect(
      await updateSavedPlot('demo-experiment-2', plot.id, {
        ...INPUT,
        name: 'X'
      })
    ).toBeNull();
    expect(await deleteSavedPlot('demo-experiment-2', plot.id)).toBe(false);
    expect((await getSavedPlot('demo-experiment-1', plot.id))?.name).toBe(
      'GPC at 600'
    );
  });

  it('updates and deletes a plot of the experiment', async () => {
    const plot = await createSavedPlot('demo-experiment-3', INPUT);

    await updateSavedPlot('demo-experiment-3', plot.id, {
      ...INPUT,
      name: 'Renamed'
    });
    expect((await getSavedPlot('demo-experiment-3', plot.id))?.name).toBe(
      'Renamed'
    );
    expect(await deleteSavedPlot('demo-experiment-3', plot.id)).toBe(true);
    expect(await listSavedPlots('demo-experiment-3')).toEqual([]);
  });
});
