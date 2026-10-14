// @vitest-environment node
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { getDb } from './client';

describe('the database connection', () => {
  it('enforces foreign keys, so a record cannot point at one that is missing', async () => {
    const db = await getDb();

    const [row] = await db.all<{ foreign_keys: number }>(
      sql`PRAGMA foreign_keys`
    );

    expect(row?.foreign_keys).toBe(1);
  });

  it('is one connection shared by every caller', async () => {
    expect(await getDb()).toBe(await getDb());
  });

  it('opens the new database when the configured one changes', async () => {
    const first = await getDb();
    const before = process.env.LAB_BRAIN_DATABASE_URL;
    process.env.LAB_BRAIN_DATABASE_URL = 'file::memory:?cache=shared';

    try {
      const second = await getDb();

      expect(second).not.toBe(first);
      expect(await getDb()).toBe(second);
    } finally {
      process.env.LAB_BRAIN_DATABASE_URL = before;
    }
  });
});
