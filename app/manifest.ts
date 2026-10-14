import type { MetadataRoute } from 'next';

import { BRAND_BACKGROUND } from '@/components/brand/logo-mark';
import { en } from '@/messages/en';

/**
 * The web app manifest, so the app can be installed or pinned with its own name
 * and icon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: en.common.appName,
    short_name: en.common.appName,
    description: en.common.appDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: BRAND_BACKGROUND,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
