import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/update-reference', () => ({
  updateReferenceAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { updateReferenceAction } from '../actions/update-reference';
import { EditReferenceDialog } from './edit-reference-dialog';

const t = en.references;
const REFERENCE = {
  id: 'r1',
  title: 'Growth of BxC',
  authors: 'A. Author',
  year: 2024,
  url: null,
  note: 'Why it matters',
  summary: 'Old summary'
};

const open = async () => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <EditReferenceDialog projectId="p1" reference={REFERENCE} />
    </NextIntlClientProvider>
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Edit Growth of BxC' }));

  return user;
};

beforeEach(() => vi.clearAllMocks());

describe('EditReferenceDialog', () => {
  it('starts from what the reference has now', async () => {
    await open();

    expect(await screen.findByLabelText(t.add.titleLabel)).toHaveValue(
      'Growth of BxC'
    );
    expect(screen.getByLabelText(t.edit.summary)).toHaveValue('Old summary');
    expect(screen.getByLabelText(t.add.year)).toHaveValue('2024');
  });

  it('saves the changed title and summary, then confirms and closes', async () => {
    vi.mocked(updateReferenceAction).mockResolvedValue(true);
    const user = await open();

    const summary = await screen.findByLabelText(t.edit.summary);
    await user.clear(summary);
    await user.type(summary, 'New summary');
    await user.click(screen.getByRole('button', { name: t.edit.save }));

    expect(updateReferenceAction).toHaveBeenCalledWith(
      'p1',
      'r1',
      expect.objectContaining({
        title: 'Growth of BxC',
        summary: 'New summary'
      })
    );
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(t.edit.saved)
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the dialog open and shows an error when the save is refused', async () => {
    vi.mocked(updateReferenceAction).mockResolvedValue(false);
    const user = await open();

    await user.click(await screen.findByRole('button', { name: t.edit.save }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('does not save an empty title', async () => {
    const user = await open();

    await user.clear(await screen.findByLabelText(t.add.titleLabel));
    await user.click(screen.getByRole('button', { name: t.edit.save }));

    expect(updateReferenceAction).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('changes nothing when cancelled, and starts again from the saved values next time', async () => {
    const user = await open();

    const title = await screen.findByLabelText(t.add.titleLabel);
    await user.type(title, ' edited');
    await user.click(screen.getByRole('button', { name: t.edit.cancel }));
    expect(updateReferenceAction).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'Edit Growth of BxC' })
    );
    expect(await screen.findByLabelText(t.add.titleLabel)).toHaveValue(
      'Growth of BxC'
    );
  });
});
