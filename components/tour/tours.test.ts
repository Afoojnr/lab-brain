import { describe, expect, it } from 'vitest';

import { buildSteps, TOURS, tourIdForPath } from './tours';

describe('tourIdForPath', () => {
  it.each([
    ['/', 'home'],
    ['/projects/p1', 'project'],
    ['/projects/p1/experiments/e1', 'experiment'],
    ['/projects/p1/experiments/e1/samples/s1', 'sample']
  ])('gives %s the %s tour', (path, expected) => {
    expect(tourIdForPath(path)).toBe(expected);
  });

  it.each([
    '/settings',
    '/plots',
    '/characterization/ftir',
    '/projects/p1/import',
    '/projects/p1/experiments/e1/samples/new',
    '/projects/p1/experiments/e1/samples/s1/edit',
    '/projects/p1/experiments/e1/samples/s1/characterizations/c1',
    '/report/projects/p1/experiments/e1'
  ])('has no tour for %s', path => {
    expect(tourIdForPath(path)).toBeNull();
  });
});

describe('buildSteps', () => {
  const everything = () => true;

  it('leaves out steps whose element is not on the page', () => {
    const ids = buildSteps(TOURS.experiment, {
      isMobile: false,
      exists: selector => !selector.includes('export-samples')
    }).map(step => step.id);

    expect(ids).not.toContain('export');
    expect(ids).toContain('addSample');
  });

  it('swaps the sidebar steps for the menu button on a phone', () => {
    const phone = buildSteps(TOURS.home, {
      isMobile: true,
      exists: everything
    }).map(step => step.id);
    const desktop = buildSteps(TOURS.home, {
      isMobile: false,
      exists: everything
    }).map(step => step.id);

    expect(phone).toEqual(['menu', 'newProject', 'help']);
    expect(desktop).not.toContain('menu');
    expect(desktop).toEqual(
      expect.arrayContaining(['projects', 'techniques', 'plots', 'settings'])
    );
  });

  it('gives every step a unique id within its tour', () => {
    for (const steps of Object.values(TOURS)) {
      const ids = steps.map(step => step.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
