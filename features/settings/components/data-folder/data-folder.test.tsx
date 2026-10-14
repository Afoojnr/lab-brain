import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../actions/data-folder', () => ({
  checkDataFolderAction: vi.fn(),
  setDataFolderAction: vi.fn(),
  backUpNowAction: vi.fn(),
  restoreBackupAction: vi.fn()
}));

import { toast } from 'sonner';

import {
  checkDataFolderAction,
  restoreBackupAction,
  setDataFolderAction
} from '../../actions/data-folder';
import { BackupsList } from './backups-list';
import { FolderForm } from './folder-form';

const text = en.settings.dataFolder;

const wrap = (node: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>
  );

describe('FolderForm', () => {
  it('offers to use the folder only after it was checked, and shows why a bad one is refused', async () => {
    const user = userEvent.setup();
    wrap(<FolderForm currentFolder={null} isManaged={false} />);

    expect(screen.queryByRole('button', { name: text.apply })).toBeNull();

    vi.mocked(checkDataFolderAction).mockResolvedValueOnce({
      isOk: false,
      reason: 'notFound'
    });
    await user.type(screen.getByLabelText(text.pathLabel), '/nowhere');
    await user.click(screen.getByRole('button', { name: text.check }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(text.errors.notFound)
    );
    expect(screen.queryByRole('button', { name: text.apply })).toBeNull();

    vi.mocked(checkDataFolderAction).mockResolvedValueOnce({
      isOk: true,
      chosen: '/nowhere',
      folder: '/nowhere/Lab Brain',
      isNew: true,
      hasFiles: false,
      hasBackups: false
    });
    await user.click(screen.getByRole('button', { name: text.check }));
    expect(await screen.findByText('/nowhere/Lab Brain')).toBeVisible();
    await user.click(await screen.findByRole('button', { name: text.apply }));

    expect(setDataFolderAction).toHaveBeenCalledWith('/nowhere', 'move');
  });

  it('chooses to use a folder that already holds files as it is', async () => {
    const user = userEvent.setup();
    wrap(<FolderForm currentFolder={null} isManaged={false} />);
    vi.mocked(checkDataFolderAction).mockResolvedValueOnce({
      isOk: true,
      chosen: '/shared',
      folder: '/shared/Lab Brain',
      isNew: false,
      hasFiles: true,
      hasBackups: true
    });
    vi.mocked(setDataFolderAction).mockResolvedValueOnce({ isOk: true });

    await user.type(screen.getByLabelText(text.pathLabel), '/shared');
    await user.click(screen.getByRole('button', { name: text.check }));
    await user.click(await screen.findByRole('button', { name: text.apply }));

    expect(setDataFolderAction).toHaveBeenCalledWith('/shared', 'use');
  });

  it('cannot be changed when the server fixes the storage folder', () => {
    wrap(<FolderForm currentFolder="/fixed" isManaged />);

    expect(screen.getByText(text.managed)).toBeVisible();
    expect(screen.queryByLabelText(text.pathLabel)).toBeNull();
  });
});

describe('BackupsList', () => {
  const backups = [
    {
      name: 'lab-brain-lab-pc-2026-10-14_1530.db',
      computer: 'lab-pc',
      createdAt: new Date(2026, 9, 14, 15, 30).toISOString(),
      sizeBytes: 100
    }
  ];

  it('asks before restoring, and restores only on confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(restoreBackupAction).mockResolvedValueOnce({ isOk: true });
    wrap(
      <BackupsList
        hasFolder
        lastBackupAt={null}
        lastBackupError={null}
        backups={backups}
      />
    );

    await user.click(
      screen.getByRole('button', { name: text.backups.restore })
    );
    expect(restoreBackupAction).not.toHaveBeenCalled();
    expect(screen.getByText(text.backups.restoreTitle)).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: text.backups.restoreConfirm })
    );

    await waitFor(() =>
      expect(restoreBackupAction).toHaveBeenCalledWith(backups[0]?.name)
    );
  });

  it('says a backup failed, with the reason, and asks for a folder when there is none', () => {
    const { unmount } = wrap(
      <BackupsList
        hasFolder
        lastBackupAt={null}
        lastBackupError="disk full"
        backups={[]}
      />
    );
    expect(screen.getByText('The last backup failed: disk full')).toBeVisible();
    unmount();

    wrap(
      <BackupsList
        hasFolder={false}
        lastBackupAt={null}
        lastBackupError={null}
        backups={[]}
      />
    );
    expect(screen.getByText(text.backups.needsFolder)).toBeVisible();
  });
});
