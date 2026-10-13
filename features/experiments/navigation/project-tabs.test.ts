import { describe, expect, it } from 'vitest';

import { parseProjectTab, PROJECT_TABS } from './project-tabs';

describe('parseProjectTab', () => {
  it('reads each of the three tabs, listed as background, experiments, references', () => {
    expect([...PROJECT_TABS]).toEqual([
      'background',
      'experiments',
      'references'
    ]);
    for (const tab of PROJECT_TABS) expect(parseProjectTab(tab)).toBe(tab);
  });

  it('opens on the experiments for nothing, a wrong name or a list', () => {
    expect(parseProjectTab(undefined)).toBe('experiments');
    expect(parseProjectTab('plots')).toBe('experiments');
    expect(parseProjectTab(['background'])).toBe('experiments');
  });
});
