import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../actions/browse-folders', () => ({
  browseFoldersAction: vi.fn(),
  createFolderAction: vi.fn()
}));

import { toast } from 'sonner';

import {
  browseFoldersAction,
  createFolderAction
} from '../../actions/browse-folders';
import { FolderPicker } from './folder-picker';

const text = en.settings.dataFolder.picker;

const listing = (path: string, parent: string | null, names: string[]) => ({
  isOk: true as const,
  path,
  parent,
  folders: names.map(name => ({ name, path: `${path}/${name}` }))
});

const setup = () => {
  const onSelect = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FolderPicker startAt={null} onSelect={onSelect} />
    </NextIntlClientProvider>
  );

  return { user: userEvent.setup(), onSelect };
};

describe('FolderPicker', () => {
  it('clicks through folders and selects the one it is in', async () => {
    vi.mocked(browseFoldersAction)
      .mockResolvedValueOnce(listing('/home/me', '/home', ['Cloud']))
      .mockResolvedValueOnce(listing('/home/me/Cloud', '/home/me', []));
    const { user, onSelect } = setup();

    await user.click(screen.getByRole('button', { name: text.choose }));
    await user.click(await screen.findByRole('button', { name: 'Cloud' }));
    expect(await screen.findByText(text.empty)).toBeVisible();
    await user.click(screen.getByRole('button', { name: text.select }));

    expect(onSelect).toHaveBeenCalledWith('/home/me/Cloud');
  });

  it('goes up a level, and cannot go above the top', async () => {
    vi.mocked(browseFoldersAction).mockResolvedValueOnce(
      listing('/', null, ['home'])
    );
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: text.choose }));
    await screen.findByRole('button', { name: 'home' });

    expect(screen.getByRole('button', { name: text.up })).toBeDisabled();
  });

  it('creates a folder and shows it', async () => {
    vi.mocked(browseFoldersAction)
      .mockResolvedValueOnce(listing('/home/me', '/home', []))
      .mockResolvedValueOnce(listing('/home/me/Lab', '/home/me', []));
    vi.mocked(createFolderAction).mockResolvedValueOnce({
      isOk: true,
      path: '/home/me/Lab'
    });
    const { user, onSelect } = setup();

    await user.click(screen.getByRole('button', { name: text.choose }));
    await user.type(await screen.findByLabelText(text.newFolderName), 'Lab');
    await user.click(screen.getByRole('button', { name: text.create }));

    await waitFor(() =>
      expect(createFolderAction).toHaveBeenCalledWith('/home/me', 'Lab')
    );
    await user.click(screen.getByRole('button', { name: text.select }));
    expect(onSelect).toHaveBeenCalledWith('/home/me/Lab');
  });

  it('shows why a folder could not be created', async () => {
    vi.mocked(browseFoldersAction).mockResolvedValueOnce(
      listing('/home/me', '/home', [])
    );
    vi.mocked(createFolderAction).mockResolvedValueOnce({
      isOk: false,
      reason: 'exists'
    });
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: text.choose }));
    await user.type(await screen.findByLabelText(text.newFolderName), 'Lab');
    await user.click(screen.getByRole('button', { name: text.create }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(text.errors.exists)
    );
  });
});
