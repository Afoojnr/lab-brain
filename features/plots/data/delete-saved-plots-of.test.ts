import { describe, expect, it } from 'vitest';

import {
  createSavedPlot,
  deleteSavedPlotsOf,
  listSavedPlots
} from './saved-plots';

describe('deleteSavedPlotsOf', () => {
  it("removes an experiment's saved plots and no other experiment's", async () => {
    const input = {
      name: 'T',
      settings: {},
      filters: [],
      untickedIds: [],
      style: {}
    } as never;
    await createSavedPlot('demo-experiment-1', input);
    await createSavedPlot('demo-experiment-1', input);
    await createSavedPlot('demo-experiment-2', input);

    expect(await deleteSavedPlotsOf('demo-experiment-1')).toBe(2);

    expect(await listSavedPlots('demo-experiment-1')).toEqual([]);
    expect(await listSavedPlots('demo-experiment-2')).toHaveLength(1);
    expect(await deleteSavedPlotsOf('demo-experiment-1')).toBe(0);
  });
});
