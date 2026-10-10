import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import { savePlotAction } from '../actions/save-plot';
import { DEFAULT_STYLE } from '../style';
import { SavePlotDialog } from './save-plot-dialog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));
vi.mock('../actions/save-plot', () => ({ savePlotAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const PLOT = {
  settings: {
    x: 'a',
    y: 'b',
    error: null,
    group: { type: 'none' as const },
    logX: false,
    logY: false
  },
  filters: [],
  untickedIds: ['s1'],
  style: DEFAULT_STYLE
};

const renderDialog = (existing?: { id: string; name: string }) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SavePlotDialog
        projectId="p1"
        experimentId="e1"
        plot={PLOT}
        otherNames={['Taken']}
        existing={existing}
        label="Save plot"
      />
    </NextIntlClientProvider>
  );

describe('SavePlotDialog', () => {
  it('asks for a title and does not save without one', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Save plot' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Give the plot a title.')
    ).toBeInTheDocument();
    expect(savePlotAction).not.toHaveBeenCalled();
  });

  it('refuses a title another saved plot has', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Save plot' }));
    await userEvent.type(await screen.findByLabelText('Title'), 'taken');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/has this title/)).toBeInTheDocument();
    expect(savePlotAction).not.toHaveBeenCalled();
  });

  it('saves the title with the plot as it is on screen', async () => {
    vi.mocked(savePlotAction).mockResolvedValue('plot-1');
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Save plot' }));
    await userEvent.type(
      await screen.findByLabelText('Title'),
      '  GPC at 600 '
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(savePlotAction).toHaveBeenCalledWith(
      'p1',
      'e1',
      { name: 'GPC at 600', ...PLOT },
      undefined
    );
  });

  it('replaces the open saved plot and prefills its title', async () => {
    vi.mocked(savePlotAction).mockResolvedValue('plot-9');
    renderDialog({ id: 'plot-9', name: 'Old title' });
    await userEvent.click(screen.getByRole('button', { name: 'Save plot' }));

    expect(await screen.findByLabelText('Title')).toHaveValue('Old title');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(savePlotAction).toHaveBeenLastCalledWith(
      'p1',
      'e1',
      { name: 'Old title', ...PLOT },
      'plot-9'
    );
  });
});
