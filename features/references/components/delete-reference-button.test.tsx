import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/delete-reference', () => ({
  deleteReferenceAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { deleteReferenceAction } from '../actions/delete-reference';
import { DeleteReferenceButton } from './delete-reference-button';

const renderButton = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DeleteReferenceButton
        projectId="p1"
        reference={{ id: 'r1', title: 'Growth of BxC' }}
      />
    </NextIntlClientProvider>
  );

beforeEach(() => vi.clearAllMocks());

describe('DeleteReferenceButton', () => {
  it('asks before deleting, and cancelling deletes nothing', async () => {
    renderButton();
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete Growth of BxC' })
    );

    expect(
      await screen.findByText('Delete this reference?')
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(deleteReferenceAction).not.toHaveBeenCalled();
  });

  it('deletes only after the confirmation', async () => {
    vi.mocked(deleteReferenceAction).mockResolvedValue(true);
    renderButton();
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete Growth of BxC' })
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete reference' })
    );

    expect(deleteReferenceAction).toHaveBeenCalledWith('p1', 'r1');
  });
});
