// @vitest-environment node
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  utimesSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  readLocalSettings,
  writeLocalSettings
} from '@/lib/config/local-settings';

import {
  BACKUPS_KEPT,
  backUpIfChanged,
  backUpNow,
  computerName,
  listBackups
} from './backup';
import { closeDb, getDb } from './client';
import { restoreBackup } from './restore';
import { projects } from './schema';

const root = mkdtempSync(path.join(tmpdir(), 'lab-brain-backup-'));
const dataFolder = path.join(root, 'shared');

beforeAll(() => {
  process.env.LAB_BRAIN_DATA_DIR = path.join(root, 'data');
  process.env.LAB_BRAIN_DATABASE_URL = `file:${path.join(root, 'data', 'lab-brain.db')}`;
  writeLocalSettings({ dataFolder });
});

const addProject = async (id: string) => {
  const db = await getDb();
  await db.insert(projects).values({
    id,
    name: id,
    description: null,
    background: null,
    createdAt: new Date()
  });
};

describe('backups', () => {
  it('writes a copy named for this computer into the data folder', async () => {
    await addProject('before-backup');

    const name = await backUpNow();

    expect(name).toMatch(
      new RegExp(
        `^lab-brain-${computerName()}-\\d{4}-\\d{2}-\\d{2}_\\d{4}\\.db$`
      )
    );
    expect(existsSync(path.join(dataFolder, 'backups', name))).toBe(true);
    expect((await listBackups()).map(backup => backup.name)).toEqual([name]);
    expect(readLocalSettings().lastBackupAt).not.toBeNull();
    expect(readLocalSettings().lastBackupError).toBeNull();
  });

  it('writes nothing when nothing changed since the last backup', async () => {
    const before = readdirSync(path.join(dataFolder, 'backups'));
    // The last backup finished after the database file was last written.
    const later = new Date(Date.now() + 60_000);
    utimesSync(path.join(root, 'data', 'lab-brain.db'), new Date(), new Date());
    writeLocalSettings({ lastBackupAt: later.toISOString() });

    expect(await backUpIfChanged()).toBe(false);
    expect(readdirSync(path.join(dataFolder, 'backups'))).toEqual(before);
  });

  it('backs up again once the database is newer than the last backup', async () => {
    writeLocalSettings({ lastBackupAt: new Date(0).toISOString() });

    expect(await backUpIfChanged()).toBe(true);
  });

  it("keeps only this computer's newest backups and leaves other computers' alone", async () => {
    const folder = path.join(dataFolder, 'backups');
    for (let index = 0; index < BACKUPS_KEPT + 5; index += 1) {
      const day = String(index + 1).padStart(2, '0');
      const month = index < 28 ? '01' : '02';
      writeFileSync(
        path.join(
          folder,
          `lab-brain-${computerName()}-2020-${month}-${index < 28 ? day : String(index - 27).padStart(2, '0')}_0900.db`
        ),
        'old'
      );
    }
    writeFileSync(
      path.join(folder, 'lab-brain-other-pc-2019-01-01_0900.db'),
      'x'
    );
    writeFileSync(path.join(folder, 'notes.txt'), 'not a backup');

    await backUpNow();

    const backups = await listBackups();
    const mine = backups.filter(backup => backup.computer === computerName());
    expect(mine).toHaveLength(BACKUPS_KEPT);
    expect(backups.some(backup => backup.computer === 'other-pc')).toBe(true);
    expect(existsSync(path.join(folder, 'notes.txt'))).toBe(true);
  });

  it('reports why a backup failed and keeps the reason', async () => {
    writeFileSync(path.join(root, 'blocker'), 'a file, not a folder');
    writeLocalSettings({ dataFolder: path.join(root, 'blocker') });

    await expect(backUpNow()).rejects.toThrow();
    expect(readLocalSettings().lastBackupError).not.toBeNull();

    writeLocalSettings({ dataFolder });
  });
});

describe('restoring', () => {
  it('brings back what the backup held, keeps a copy of what was replaced, and refuses other names', async () => {
    const name = await backUpNow();
    await addProject('after-backup');

    const result = await restoreBackup(name);

    expect(result.isOk).toBe(true);
    if (result.isOk) expect(existsSync(result.savedAs)).toBe(true);
    const db = await getDb();
    const ids = (await db.select({ id: projects.id }).from(projects)).map(
      p => p.id
    );
    expect(ids).toContain('before-backup');
    expect(ids).not.toContain('after-backup');

    expect(await restoreBackup('../../etc/passwd')).toEqual({
      isOk: false,
      reason: 'invalidName'
    });
    expect(await restoreBackup('lab-brain-x-2000-01-01_0000.db')).toEqual({
      isOk: false,
      reason: 'notFound'
    });
    await closeDb();
  });
});
