import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    // Attached files go through a Server Action: 50 MB plus room for the
    // multipart overhead (see `MAX_DATASET_BYTES`).
    serverActions: { bodySizeLimit: '51mb' }
  }
};

export default withNextIntl(nextConfig);
