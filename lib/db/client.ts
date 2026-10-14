import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

import { getDataDirectory, isDemoMode } from '@/lib/config/local-settings';
import { copyDemoFiles } from '@/lib/storage/demo-files';

import * as schema from './schema';
import { startAutomaticBackups } from './backup';
import { seedDemoIfEmpty } from './seed';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

type Connection = {
  url: string;
  client: Client;
  database: Promise<Database>;
};

/**
 * Where the live database is. It stays on the local disk (never on a synced or
 * network drive, which can corrupt SQLite): `LAB_BRAIN_DATABASE_URL`, else the
 * demo's temporary file, else `lab-brain.db` in the data directory.
 */
export const getDatabaseUrl = (): string => {
  if (process.env.LAB_BRAIN_DATABASE_URL) {
    return process.env.LAB_BRAIN_DATABASE_URL;
  }
  if (isDemoMode()) return 'file:/tmp/lab-brain.db';

  return `file:${path.join(getDataDirectory(), 'lab-brain.db')}`;
};

const open = async (url: string, client: Client): Promise<Database> => {
  const database = drizzle(client, { schema });
  await migrate(database, {
    migrationsFolder: path.join(process.cwd(), 'drizzle')
  });
  // SQLite only enforces foreign keys (and so the cascades) when asked. Set
  // after the migrations: the migrator's transaction gives the client a fresh
  // connection, which would lose the setting.
  await client.execute('PRAGMA foreign_keys = ON');
  if (process.env.LAB_BRAIN_SEED_DEMO === 'true' || isDemoMode()) {
    await seedDemoIfEmpty(database);
  }
  if (isDemoMode()) await copyDemoFiles();
  if (url.startsWith('file:') && !isDemoMode()) startAutomaticBackups();

  return database;
};

const connect = (): Connection => {
  const url = getDatabaseUrl();
  if (url.startsWith('file:')) {
    mkdirSync(path.dirname(url.slice('file:'.length)), { recursive: true });
  }
  const client = createClient({ url });

  return { url, client, database: open(url, client) };
};

// On `globalThis` because a Route Handler (the assistant, the file route) is
// bundled apart from the pages and actions: a module-level connection would be
// a separate copy there (and a separate `:memory:` database in tests).
const store = globalThis as { __labBrainConnection?: Connection };

/**
 * The one database connection of this server, opened (and migrated) on first
 * use. If the configured database changed since (the demo switched on or off,
 * a new `LAB_BRAIN_DATABASE_URL`), the old connection is closed and the new
 * database is opened, so a running server never keeps using a stale file.
 */
export const getDb = (): Promise<Database> => {
  const current = store.__labBrainConnection;
  if (current && current.url !== getDatabaseUrl()) {
    store.__labBrainConnection = undefined;
    current.database.then(
      () => current.client.close(),
      () => current.client.close()
    );
  }

  return (store.__labBrainConnection ??= connect()).database;
};

/**
 * Closes the connection so the database file can be replaced; the next
 * `getDb()` opens the new file and brings it up to date.
 */
export const closeDb = async (): Promise<void> => {
  const connection = store.__labBrainConnection;
  if (!connection) return;

  store.__labBrainConnection = undefined;
  await connection.database.catch(() => undefined);
  connection.client.close();
};
