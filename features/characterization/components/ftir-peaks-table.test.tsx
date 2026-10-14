import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import { defaultFtirSettings } from '../techniques/ftir/defaults';
import { processSpectrum } from '../techniques/ftir/process';
import { syntheticSpectrum } from '../techniques/ftir/synthetic';
import type { FtirPeak } from '../techniques/ftir/types';
import { FtirPeaksTable } from './ftir-peaks-table';

const t = en.analysis.ftir.peaks;
const SPECTRUM = {
  id: 's',
  label: 'FAKE.csv',
  processed: processSpectrum(
    syntheticSpectrum({
      bands: [{ at: 1100, depth: 40, width: 25 }],
      noise: 0
    }),
    defaultFtirSettings()
  )
};

const render_ = (peaks: FtirPeak[], onChange = vi.fn()) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FtirPeaksTable
        peaks={peaks}
        spectra={[SPECTRUM]}
        tolerance={10}
        onChange={onChange}
      />
    </NextIntlClientProvider>
  );

  return onChange;
};

describe('FtirPeaksTable', () => {
  it('says how to get peaks when there are none', () => {
    render_([]);

    expect(screen.getByText(t.empty)).toBeInTheDocument();
  });

  it('shows the value at each peak and says when there is no data near one, never 0', () => {
    render_([
      { id: 'a', position: 1100, label: '' },
      { id: 'b', position: 9000, label: '' }
    ]);
    const rows = screen.getAllByRole('row');

    expect(within(rows[1]).getByText(/^40(\.\d+)? %$/)).toBeInTheDocument();
    expect(within(rows[2]).getByText(t.noValue)).toBeInTheDocument();
  });

  it('writes the bond label the user types onto that peak', async () => {
    const user = userEvent.setup();
    const onChange = render_([{ id: 'a', position: 1100, label: '' }]);

    await user.type(
      screen.getByLabelText(t.bondFor.replace('{position}', '1100')),
      'B'
    );

    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'a', position: 1100, label: 'B' }
    ]);
  });

  it('removes a peak and adds one by its position', async () => {
    const user = userEvent.setup();
    const onChange = render_([
      { id: 'a', position: 1100, label: '' },
      { id: 'b', position: 1650, label: '' }
    ]);

    await user.click(
      screen.getByRole('button', {
        name: t.remove.replace('{position}', '1650')
      })
    );
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'a', position: 1100, label: '' }
    ]);

    await user.type(screen.getByLabelText(t.addPosition), '2900');
    await user.click(screen.getByRole('button', { name: t.add }));
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'a', position: 1100, label: '' },
      { id: 'b', position: 1650, label: '' },
      expect.objectContaining({ position: 2900, label: '' })
    ]);
  });
});
