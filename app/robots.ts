import type { MetadataRoute } from 'next';

import { getSiteUrl, isIndexingAllowed } from '@/lib/site/site';

/** Keeps crawlers out unless indexing was switched on. */
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
