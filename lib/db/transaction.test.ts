// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { getDb, runInTransaction } from './client';
import { projects } from './schema';

beforeAll(() => {
  const folder = mkdtempSync(path.join(tmpdir(), 'lab-brain-tx-'));
  process.env.LAB_BRAIN_DATABASE_URL = `file:${path.join(folder, 'lab-brain.db')}`;
});

const insert = async (id: string) =>
  (await getDb()).insert(projects).values({
    id,
    name: id,
    description: null,
    background: null,
    createdAt: new Date()
  });

describe('a transaction on a database file', () => {
  it('rolls everything back on failure, and keeps working and enforcing foreign keys afterwards', async () => {
    await expect(
      runInTransaction(async () => {
        await insert('a');
        await insert('b');
        throw new Error('stop');
      })
    ).rejects.toThrow('stop');

    const db = await getDb();
    const ids = async () =>
      (await db.select().from(projects)).map(project => project.id);
    expect(await ids()).not.toContain('a');
    expect(await ids()).not.toContain('b');

    await runInTransaction(async () => {
      await insert('kept');
    });
    expect(await ids()).toContain('kept');

    const [row] = await db.all<{ foreign_keys: number }>(
      sql`PRAGMA foreign_keys`
    );
    expect(row?.foreign_keys).toBe(1);
  });
});
