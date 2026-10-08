import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import { FileViewer, ViewFileTrigger } from './file-viewer';
import type { ViewerItem } from './viewer-body';

const t = en.common.fileViewer;

const ITEMS: ViewerItem[] = [
  {
    id: 'a',
    label: 'one.png',
    url: '/f/a',
    previewUrl: '/f/a?p',
    kind: 'image'
  },
  {
    id: 'b',
    label: 'Image 1.tiff',
    url: '/f/b',
    previewUrl: '/f/b?preview=png&w=2000',
    kind: 'tiff'
  },
  {
    id: 'c',
    label: 'table.csv',
    url: '/f/c',
    previewUrl: '/f/c?p',
    kind: 'csv'
  }
];

const renderViewer = (items = ITEMS) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FileViewer items={items}>
        {items.map(item => (
          <ViewFileTrigger
            key={item.id}
            id={item.id}
            label={`open ${item.label}`}
          >
            {item.label}
          </ViewFileTrigger>
        ))}
      </FileViewer>
    </NextIntlClientProvider>
  );

  return userEvent.setup();
};

afterEach(() => vi.unstubAllGlobals());

describe('FileViewer', () => {
  it('shows an image larger in the page, with a link to download the original', async () => {
    const user = renderViewer();

    await user.click(screen.getByRole('button', { name: 'open one.png' }));

    expect(await screen.findByRole('img', { name: 'one.png' })).toHaveAttribute(
      'src',
      '/f/a'
    );
    expect(screen.getByRole('link', { name: t.download })).toHaveAttribute(
      'href',
      '/f/a'
    );
  });

  it('shows a TIFF through its PNG copy', async () => {
    const user = renderViewer();

    await user.click(screen.getByRole('button', { name: 'open Image 1.tiff' }));

    expect(
      await screen.findByRole('img', { name: 'Image 1.tiff' })
    ).toHaveAttribute('src', '/f/b?preview=png&w=2000');
  });

  it('goes to the next and previous file, around the ends', async () => {
    const user = renderViewer();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => 'a,b\n1,2' })
    );

    await user.click(screen.getByRole('button', { name: 'open one.png' }));
    await user.click(screen.getByRole('button', { name: t.next }));
    expect(
      await screen.findByRole('img', { name: 'Image 1.tiff' })
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: t.previous }));
    await user.click(screen.getByRole('button', { name: t.previous }));
    // Before the first file is the last one: the table.
    expect(await screen.findByText('2')).toBeVisible();
  });

  it('shows a CSV as a table', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'Sample;Power\nALD001;1,5'
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = renderViewer();

    await user.click(screen.getByRole('button', { name: 'open table.csv' }));

    expect(await screen.findByRole('cell', { name: 'ALD001' })).toBeVisible();
    expect(screen.getByRole('cell', { name: '1,5' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith('/f/c');
  });

  it('says so, and still offers the download, when a file cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = renderViewer();

    await user.click(screen.getByRole('button', { name: 'open table.csv' }));

    await waitFor(() => expect(screen.getByText(t.loadFailed)).toBeVisible());
    expect(screen.getByRole('link', { name: t.download })).toBeVisible();
  });
});
