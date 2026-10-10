import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import { deleteSavedPlotAction } from '../actions/delete-saved-plot';
import { SavedPlotsList } from './saved-plots-list';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));
vi.mock('../actions/delete-saved-plot', () => ({
  deleteSavedPlotAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const renderList = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SavedPlotsList
        projectId="p1"
        experimentId="e1"
        plots={[{ id: 'plot-1', name: 'GPC at 600' }]}
        openId={null}
      />
    </NextIntlClientProvider>
  );

describe('SavedPlotsList', () => {
  it('asks before deleting, and cancelling deletes nothing', async () => {
    renderList();
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete GPC at 600' })
    );

    expect(
      await screen.findByText('Delete this saved plot?')
    ).toBeInTheDocument();
    expect(deleteSavedPlotAction).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(deleteSavedPlotAction).not.toHaveBeenCalled();
    expect(
      screen.queryByText('Delete this saved plot?')
    ).not.toBeInTheDocument();
  });

  it('deletes only after the confirmation', async () => {
    vi.mocked(deleteSavedPlotAction).mockResolvedValue(true);
    renderList();
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete GPC at 600' })
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete plot' })
    );

    expect(deleteSavedPlotAction).toHaveBeenCalledWith('p1', 'e1', 'plot-1');
  });
});
