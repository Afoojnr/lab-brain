// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DEMO_DATASETS } from '@/lib/db/demo/demo-datasets';

import { copyDemoFiles } from './demo-files';
import { createLocalStorage } from './local-adapter';

afterEach(() => {
  delete process.env.LAB_BRAIN_STORAGE_DIR;
});

describe('copyDemoFiles', () => {
  it('puts every file the example datasets point at into storage', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'lab-brain-demo-files-'));
    process.env.LAB_BRAIN_STORAGE_DIR = root;

    await copyDemoFiles();

    const stored = await createLocalStorage(root).list('');
    for (const dataset of DEMO_DATASETS) {
      expect(stored).toContain(dataset.storagePath);
    }
  });
});
