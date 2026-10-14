import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));
vi.mock('../actions/delete-study', () => ({ deleteStudyAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { deleteStudyAction } from '../actions/delete-study';
import { DeleteStudyButton } from './delete-study-button';

const t = en.experiments.delete;

const open = async () => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DeleteStudyButton
        projectId="p1"
        experimentId="e1"
        study={{ id: 's1', name: 'Plasma pulse study' }}
        sampleCount={4}
      />
    </NextIntlClientProvider>
  );
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Delete Plasma pulse study' })
  );

  return user;
};

beforeEach(() => vi.clearAllMocks());

describe('DeleteStudyButton', () => {
  it('says its samples stay, and deletes nothing until confirmed', async () => {
    await open();

    expect(
      await screen.findByText(
        '4 samples keep all their data and only lose the tag.'
      )
    ).toBeInTheDocument();
    expect(deleteStudyAction).not.toHaveBeenCalled();
  });

  it('deletes that study on confirmation and says so', async () => {
    vi.mocked(deleteStudyAction).mockResolvedValue(4);
    const user = await open();

    await user.click(
      await screen.findByRole('button', { name: t.study.confirm })
    );

    expect(deleteStudyAction).toHaveBeenCalledWith('p1', 'e1', 's1');
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(t.study.done)
    );
  });
});
