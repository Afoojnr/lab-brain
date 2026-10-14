import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT ?? '3000';

// Each run gets its own empty database (seeded with the example data) and its
// own storage folder holding the example files, so test projects never pile up
// in the developer's own data.
const runFolder = mkdtempSync(path.join(tmpdir(), 'lab-brain-e2e-'));
cpSync(
  path.join(process.cwd(), 'lib', 'db', 'demo', 'files'),
  path.join(runFolder, 'storage', 'demo'),
  {
    recursive: true
  }
);

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /*
   * The dev server compiles each page the first time it is visited, and the
   * flows are long, so wait longer than the 5 s / 30 s defaults.
   */
  timeout: 60_000,
  expect: { timeout: 15_000 },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: `http://localhost:${port}`,

    // The guided tours are off for every test (their card would sit over the
    // page); e2e/tour.spec.ts turns them back on for itself.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${port}`,
          localStorage: [
            {
              name: 'lab-brain:tours',
              value: JSON.stringify({ seen: [], isOff: true })
            }
          ]
        }
      ]
    },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }

    // Add firefox/webkit back if a cross-browser bug ever shows up; running
    // one real flow through three engines isn't worth the time yet.

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // E2E_PROD=true runs a production build (`yarn build` first) and E2E_PORT
    // picks another port, so a dev server you have open is left alone.
    command: process.env.E2E_PROD
      ? `yarn start -p ${port}`
      : `yarn dev -p ${port}`,
    url: `http://localhost:${port}`,
    // The assistant answers with a built-in stand-in, so no test needs a real key.
    env: {
      LAB_BRAIN_MOCK_AI: 'true',
      LAB_BRAIN_DATA_DIR: path.join(runFolder, 'data'),
      LAB_BRAIN_STORAGE_DIR: path.join(runFolder, 'storage'),
      LAB_BRAIN_SEED_DEMO: 'true',
      // Never the public demo, even when .env switches it on for a trial: that
      // would put test projects into the shared demo database in /tmp.
      LAB_BRAIN_DEMO: 'false'
    },
    reuseExistingServer: !process.env.CI
  }
});
