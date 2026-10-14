// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const storage = vi.hoisted(() => ({ delete: vi.fn(async () => true) }));
vi.mock('@/lib/storage', () => ({
  getStorage: () => storage,
  getStorageRoot: () => '/same/as/app'
}));
vi.mock('@/lib/storage/demo-files', () => ({
  copyDemoFiles: vi.fn(async () => 0)
}));

import { getProjectById } from '@/features/experiments/server';
import { getDb } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { hasDemo } from '@/lib/db/seed';
import { copyDemoFiles } from '@/lib/storage/demo-files';

import { addExampleDataAction, removeExampleDataAction } from './example-data';

afterEach(() => {
  delete process.env.LAB_BRAIN_DEMO;
});

describe('example data', () => {
  it('does nothing outside the public demo', async () => {
    expect(await removeExampleDataAction()).toBe(0);
    expect(await addExampleDataAction()).toBe(false);
    expect(await hasDemo(await getDb())).toBe(true);
  });

  it("is removed with its projects, the visitor's own project stays, and the shared example files are never deleted", async () => {
    process.env.LAB_BRAIN_DEMO = 'true';
    await (await getDb()).insert(projects).values({
      id: 'mine',
      name: 'My own',
      description: null,
      background: null,
      createdAt: new Date()
    });

    expect(await removeExampleDataAction()).toBe(3);

    expect(await hasDemo(await getDb())).toBe(false);
    expect(await getProjectById('demo-project-1')).toBeUndefined();
    expect(await getProjectById('mine')).toBeDefined();
    expect(storage.delete).not.toHaveBeenCalledWith(
      expect.stringMatching(/^demo\//)
    );
  });

  it('is added back with its files, and adding it twice changes nothing', async () => {
    process.env.LAB_BRAIN_DEMO = 'true';

    expect(await addExampleDataAction()).toBe(true);
    expect(copyDemoFiles).toHaveBeenCalledTimes(1);
    expect(await hasDemo(await getDb())).toBe(true);

    expect(await addExampleDataAction()).toBe(false);
    expect(copyDemoFiles).toHaveBeenCalledTimes(1);
  });
});
