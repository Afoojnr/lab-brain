import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
  // The Docker image runs the self-contained server (`server.js`). Only that
  // build asks for it, so `next start` keeps working everywhere else (Render,
  // local).
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // The migrations and the example files are read from disk at run time, so the
  // build has to ship them with the server (Vercel, and the Docker image).
  outputFileTracingIncludes: {
    '/**': ['./drizzle/**/*', './lib/db/demo/files/**/*']
  },
  // Never ship local data, keys or tooling with a build. (File access by a
  // computed path makes the tracer pull in the whole project folder.)
  outputFileTracingExcludes: {
    '/**': [
      './data/**/*',
      './storage/**/*',
      './.env*',
      './.git/**/*',
      './.claude/**/*',
      './e2e/**/*',
      './test-results/**/*',
      './playwright-report/**/*',
      './blob-report/**/*',
      './scripts/**/*'
    ]
  },
  experimental: {
    // Attached files go through a Server Action: 50 MB plus room for the
    // multipart overhead (see `MAX_DATASET_BYTES`).
    serverActions: { bodySizeLimit: '51mb' }
  }
};

export default withNextIntl(nextConfig);
