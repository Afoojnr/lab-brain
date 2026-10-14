import { describe, expect, it } from 'vitest';

import {
  createSavedPlot,
  deleteSavedPlotsOf,
  listSavedPlots
} from './saved-plots';

describe('deleteSavedPlotsOf', () => {
  it("removes an experiment's saved plots and no other experiment's", async () => {
    const input = { title: 'T' } as never;
    await createSavedPlot('gone', input);
    await createSavedPlot('gone', input);
    await createSavedPlot('kept', input);

    expect(await deleteSavedPlotsOf('gone')).toBe(2);

    expect(await listSavedPlots('gone')).toEqual([]);
    expect(await listSavedPlots('kept')).toHaveLength(1);
    expect(await deleteSavedPlotsOf('gone')).toBe(0);
  });
});
