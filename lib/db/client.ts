import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

import { getDataDirectory, isDemoMode } from '@/lib/config/local-settings';

import * as schema from './schema';
import { startAutomaticBackups } from './backup';
import { seedDemoIfEmpty } from './seed';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

type Connection = {
  url: string;
  client: Client;
  database: Promise<Database>;
  /** Opened and migrated, so a missing file is a real loss, not a start-up. */
  isReady: boolean;
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
  // Tests and e2e start with the example data; the public demo does not (a
  // visitor adds it with the button).
  if (process.env.LAB_BRAIN_SEED_DEMO === 'true') {
    await seedDemoIfEmpty(database);
  }
  if (url.startsWith('file:') && !isDemoMode()) startAutomaticBackups();

  return database;
};

const connect = (): Connection => {
  const url = getDatabaseUrl();
  if (url.startsWith('file:')) {
    mkdirSync(path.dirname(url.slice('file:'.length)), { recursive: true });
  }
  const client = createClient({ url });

  const connection: Connection = {
    url,
    client,
    database: open(url, client),
    isReady: false
  };
  connection.database.then(
    () => {
      connection.isReady = true;
    },
    () => undefined
  );

  return connection;
};

// On `globalThis` because a Route Handler (the assistant, the file route) is
// bundled apart from the pages and actions: a module-level connection would be
// a separate copy there (and a separate `:memory:` database in tests).
const store = globalThis as { __labBrainConnection?: Connection };

// While `runInTransaction` runs, every `getDb()` call inside it (including the
// ones made by the data functions) returns the open transaction.
const transactionStore = new AsyncLocalStorage<Database>();

/** A database file that was there when opened and has been removed since. */
const isFileGone = (connection: Connection): boolean =>
  connection.isReady &&
  connection.url.startsWith('file:') &&
  !connection.url.includes(':memory:') &&
  !existsSync(connection.url.slice('file:'.length));

const getConnection = (): Promise<Database> => {
  const current = store.__labBrainConnection;
  if (current && (current.url !== getDatabaseUrl() || isFileGone(current))) {
    store.__labBrainConnection = undefined;
    current.database.then(
      () => current.client.close(),
      () => current.client.close()
    );
  }

  return (store.__labBrainConnection ??= connect()).database;
};

/**
 * The one database connection, opened and migrated on first use. It is opened
 * again if the configured database changed or its file was removed, so a running
 * server never keeps using a stale file.
 */
export const getDb = (): Promise<Database> => {
  const transaction = transactionStore.getStore();

  return transaction ? Promise.resolve(transaction) : getConnection();
};

/**
 * Runs several writes as one: either all of them are kept or, if any throws,
 * none. Every data function called inside `work` takes part, because `getDb()`
 * returns the transaction there.
 */
export const runInTransaction = async <Result>(
  work: () => Promise<Result>
): Promise<Result> => {
  if (transactionStore.getStore()) return work();

  const database = await getConnection();

  return database.transaction(async transaction =>
    // A transaction offers the same queries as the database it came from.
    transactionStore.run(transaction as unknown as Database, work)
  );
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
