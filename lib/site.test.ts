import { afterEach, describe, expect, it } from 'vitest';

import { getSiteUrl, isIndexingAllowed } from './site';

afterEach(() => {
  delete process.env.LAB_BRAIN_SITE_URL;
  delete process.env.LAB_BRAIN_ALLOW_INDEXING;
});

describe('getSiteUrl', () => {
  it('falls back to localhost, and uses the configured address', () => {
    expect(getSiteUrl()).toBe('http://localhost:3000');

    process.env.LAB_BRAIN_SITE_URL = ' https://lab-brain-demo.onrender.com ';
    expect(getSiteUrl()).toBe('https://lab-brain-demo.onrender.com');
  });
});

describe('isIndexingAllowed', () => {
  it('is off unless explicitly switched on', () => {
    expect(isIndexingAllowed()).toBe(false);

    process.env.LAB_BRAIN_ALLOW_INDEXING = 'yes';
    expect(isIndexingAllowed()).toBe(false);

    process.env.LAB_BRAIN_ALLOW_INDEXING = 'true';
    expect(isIndexingAllowed()).toBe(true);
  });
});
