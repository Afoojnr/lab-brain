// @vitest-environment node
import { count, inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { getDb } from './client';
import { DEMO_PROJECT_IDS, seedDemo, seedDemoIfEmpty } from './seed';
import { projects, samples } from './schema';

const hasExample = async (db: Awaited<ReturnType<typeof getDb>>) =>
  (
    await db
      .select({ id: projects.id })
      .from(projects)
      .where(inArray(projects.id, DEMO_PROJECT_IDS))
  ).length > 0;

describe('the example data', () => {
  it('is in a fresh database, and adding it again changes nothing', async () => {
    const db = await getDb();
    const [before] = await db.select({ total: count() }).from(samples);

    expect(await hasExample(db)).toBe(true);
    expect(await seedDemo(db)).toBe(false);

    const [after] = await db.select({ total: count() }).from(samples);
    expect(after?.total).toBe(before?.total);
    expect(before?.total).toBeGreaterThan(0);
  });

  it("is not added next to a user's own projects when seeding an empty database", async () => {
    const db = await getDb();
    await db.delete(projects);
    await db.insert(projects).values({
      id: 'mine',
      name: 'Mine',
      description: null,
      background: null,
      createdAt: new Date()
    });

    await seedDemoIfEmpty(db);

    expect(await hasExample(db)).toBe(false);
    expect(
      (await db.select({ id: projects.id }).from(projects)).map(p => p.id)
    ).toEqual(['mine']);
  });

  it("can be added on request next to a user's own projects", async () => {
    const db = await getDb();

    expect(await seedDemo(db)).toBe(true);

    const ids = (await db.select({ id: projects.id }).from(projects)).map(
      project => project.id
    );
    expect(ids).toEqual(expect.arrayContaining(['mine', ...DEMO_PROJECT_IDS]));
  });
});
