import { describe, expect, it } from 'vitest';

import { defaultSectionTab, parseSectionTab, SECTION_TABS } from './sections';

describe('parseSectionTab', () => {
  it('reads each of the four tabs', () => {
    for (const tab of SECTION_TABS) expect(parseSectionTab(tab)).toBe(tab);
  });

  it('is undefined for nothing, a wrong name or a list', () => {
    expect(parseSectionTab(undefined)).toBeUndefined();
    expect(parseSectionTab('columns')).toBeUndefined();
    expect(parseSectionTab(['plots', 'setup'])).toBeUndefined();
  });
});

describe('SECTION_TABS', () => {
  it('lists protocol, setup, samples and plots in that order', () => {
    expect([...SECTION_TABS]).toEqual([
      'protocol',
      'setup',
      'samples',
      'plots'
    ]);
  });
});

describe('defaultSectionTab', () => {
  it('opens on the samples once there are some, and on the setup while there are none', () => {
    expect(defaultSectionTab(23)).toBe('samples');
    expect(defaultSectionTab(1)).toBe('samples');
    expect(defaultSectionTab(0)).toBe('setup');
  });
});
