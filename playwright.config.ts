import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT ?? '3000';

// Every run gets its own database (with the example data) and storage folder,
// so test projects never pile up in your own data.
const runFolder = mkdtempSync(path.join(tmpdir(), 'lab-brain-e2e-'));
cpSync(
  path.join(process.cwd(), 'lib', 'db', 'demo', 'files'),
  path.join(runFolder, 'storage', 'demo'),
  { recursive: true }
);

export default defineConfig({
  testDir: './e2e',
  // The dev server compiles each page the first time it is visited.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${port}`,
    // Guided tours are off so their card never sits over a page;
    // e2e/tour.spec.ts turns them back on.
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
    trace: 'on-first-retry'
  },
  // One browser is enough until a cross-browser bug shows up.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // E2E_PROD=true runs a production build (`yarn build` first), and E2E_PORT
    // picks another port so a dev server you have open is left alone.
    command: process.env.E2E_PROD
      ? `yarn start -p ${port}`
      : `yarn dev -p ${port}`,
    url: `http://localhost:${port}`,
    env: {
      // The assistant answers with a built-in stand-in, so no key is needed.
      LAB_BRAIN_MOCK_AI: 'true',
      LAB_BRAIN_DATA_DIR: path.join(runFolder, 'data'),
      LAB_BRAIN_STORAGE_DIR: path.join(runFolder, 'storage'),
      LAB_BRAIN_SEED_DEMO: 'true',
      // Never the demo, even if .env turns it on: test projects would land in
      // the shared demo database.
      LAB_BRAIN_DEMO: 'false'
    },
    reuseExistingServer: !process.env.CI
  }
});
