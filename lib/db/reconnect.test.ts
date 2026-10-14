// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { getDb } from './client';
import { projects } from './schema';

const folder = mkdtempSync(path.join(tmpdir(), 'lab-brain-reconnect-'));
const file = path.join(folder, 'data', 'lab-brain.db');

beforeAll(() => {
  process.env.LAB_BRAIN_DATABASE_URL = `file:${file}`;
  // An empty database, so what is left after the file goes is easy to tell.
  process.env.LAB_BRAIN_SEED_DEMO = 'false';
});

describe('a database file that disappears while the app runs', () => {
  it('starts a new empty database instead of failing every request', async () => {
    const first = await getDb();
    await first.insert(projects).values({
      id: 'before',
      name: 'Before',
      description: null,
      background: null,
      createdAt: new Date()
    });
    expect(await first.select().from(projects)).toHaveLength(1);

    rmSync(path.join(folder, 'data'), { recursive: true, force: true });

    const second = await getDb();
    expect(second).not.toBe(first);
    expect(await second.select().from(projects)).toEqual([]);
  });
});
