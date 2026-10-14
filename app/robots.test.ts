import { afterEach, describe, expect, it } from 'vitest';

import robots from './robots';

afterEach(() => {
  delete process.env.LAB_BRAIN_ALLOW_INDEXING;
  delete process.env.LAB_BRAIN_SITE_URL;
});

describe('robots', () => {
  it('keeps every crawler out by default', () => {
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  it('opens up when indexing is allowed, but never the records or the files', () => {
    process.env.LAB_BRAIN_ALLOW_INDEXING = 'true';
    process.env.LAB_BRAIN_SITE_URL = 'https://example.org';

    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/report/', '/projects/', '/settings']
      },
      host: 'https://example.org'
    });
  });
});
