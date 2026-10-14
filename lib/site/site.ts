/** The address the app is served from, for absolute links in previews. */
const DEFAULT_SITE_URL = 'http://localhost:3000';

/** The public address of this install: `LAB_BRAIN_SITE_URL`, else localhost. */
export const getSiteUrl = (): string =>
  process.env.LAB_BRAIN_SITE_URL?.trim() || DEFAULT_SITE_URL;

/**
 * Whether search engines may index the site. Off unless
 * `LAB_BRAIN_ALLOW_INDEXING=true`: the demo is empty and resets, and there is no
 * landing page yet, so there is nothing worth indexing.
 */
export const isIndexingAllowed = (): boolean =>
  process.env.LAB_BRAIN_ALLOW_INDEXING === 'true';
