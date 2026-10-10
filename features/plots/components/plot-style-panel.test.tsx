import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import { DEFAULT_STYLE } from '../style';
import { PlotStylePanel } from './plot-style-panel';

const DEFAULTS = { title: 'Y vs X', xTitle: 'X (W)', yTitle: 'Y (nm)' };

const renderPanel = (canShowSource = true, onChange = vi.fn()) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PlotStylePanel
        style={DEFAULT_STYLE}
        onChange={onChange}
        defaults={DEFAULTS}
        canShowSource={canShowSource}
      />
    </NextIntlClientProvider>
  );
  return onChange;
};

describe('PlotStylePanel', () => {
  it('shows the default titles as placeholders, so an empty box means the default', () => {
    renderPanel();

    expect(screen.getByLabelText('Plot title')).toHaveAttribute(
      'placeholder',
      'Y vs X'
    );
    expect(screen.getByLabelText('Y axis title')).toHaveAttribute(
      'placeholder',
      'Y (nm)'
    );
  });

  it('reports a typed axis bound and a ticked option', async () => {
    const onChange = renderPanel();

    await userEvent.type(screen.getByLabelText('Y maximum'), '9');
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_STYLE, yMax: '9' });

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Show how many samples were plotted and left out'
      })
    );
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_STYLE,
      showCounts: true
    });
  });

  it('offers to show the source only when there is one, and resets to the defaults', async () => {
    const onChange = renderPanel(false);

    expect(
      screen.queryByRole('checkbox', { name: 'Show where the data is from' })
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_STYLE);
  });

  it('keeps the source and the counts off by default on exported figures', () => {
    expect(DEFAULT_STYLE.showSource).toBe(false);
    expect(DEFAULT_STYLE.showCounts).toBe(false);
  });
});
