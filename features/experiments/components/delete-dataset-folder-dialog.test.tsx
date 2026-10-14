import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/delete-dataset-folder', () => ({
  deleteDatasetFolderAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { deleteDatasetFolderAction } from '../actions/delete-dataset-folder';
import { DeleteDatasetFolderDialog } from './delete-dataset-folder-dialog';

const open = async () => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DeleteDatasetFolderDialog
        projectId="p1"
        experimentId="e1"
        sampleId="s1"
        characterizationId="c1"
        folder="ABC130"
        fileCount={47}
      />
    </NextIntlClientProvider>
  );
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Delete folder ABC130' })
  );

  return user;
};

beforeEach(() => vi.clearAllMocks());

describe('DeleteDatasetFolderDialog', () => {
  it('asks once, saying how many files go with the folder, and deletes nothing until confirmed', async () => {
    await open();

    expect(
      await screen.findByText('Delete ABC130 and its 47 files?')
    ).toBeInTheDocument();
    expect(deleteDatasetFolderAction).not.toHaveBeenCalled();
  });

  it('deletes the whole folder in one confirmation and says how many files went', async () => {
    vi.mocked(deleteDatasetFolderAction).mockResolvedValue(47);
    const user = await open();

    await user.click(
      await screen.findByRole('button', { name: 'Delete folder' })
    );

    expect(deleteDatasetFolderAction).toHaveBeenCalledTimes(1);
    expect(deleteDatasetFolderAction).toHaveBeenCalledWith(
      'p1',
      'e1',
      's1',
      'c1',
      'ABC130'
    );
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('ABC130 deleted (47 files)')
    );
  });

  it('cancels without deleting, and shows an error when nothing was removed', async () => {
    const user = await open();
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(deleteDatasetFolderAction).not.toHaveBeenCalled();

    vi.mocked(deleteDatasetFolderAction).mockResolvedValue(null);
    await user.click(
      screen.getByRole('button', { name: 'Delete folder ABC130' })
    );
    await user.click(
      await screen.findByRole('button', { name: 'Delete folder' })
    );

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
