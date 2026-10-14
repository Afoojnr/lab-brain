import type { MetadataRoute } from 'next';

import { getSiteUrl, isIndexingAllowed } from '@/lib/site';

/**
 * Keeps crawlers out unless indexing was switched on. When it is, the app's
 * data pages and the file routes are still left alone: they hold the user's
 * records, not public content.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexingAllowed()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/report/', '/projects/', '/settings']
    },
    host: getSiteUrl()
  };
}
