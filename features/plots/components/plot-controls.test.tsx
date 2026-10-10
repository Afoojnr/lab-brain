import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import type { PlotColumn, PlotSettings } from '../types';
import { PlotControls } from './plot-controls';

const COLUMNS: PlotColumn[] = [
  { key: 'power', name: 'Power', unit: 'W', kind: 'number' },
  { key: 'thickness', name: 'Thickness', unit: 'nm', kind: 'number' },
  { key: 'gas', name: 'Gas', unit: null, kind: 'text' }
];
const SETTINGS: PlotSettings = {
  x: 'power',
  y: 'thickness',
  error: null,
  group: { type: 'none' },
  logX: false,
  logY: false
};

const renderControls = (canGroupByStudy: boolean, onChange = vi.fn()) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PlotControls
        columns={COLUMNS}
        canGroupByStudy={canGroupByStudy}
        settings={SETTINGS}
        onChange={onChange}
      />
    </NextIntlClientProvider>
  );
  return onChange;
};

describe('PlotControls', () => {
  it("lists an experiment's columns under headings, results first for Y", async () => {
    const columns: PlotColumn[] = [
      {
        key: 'temp',
        name: 'Temperature',
        unit: '°C',
        kind: 'number',
        role: 'parameter'
      },
      {
        key: 'thick',
        name: 'Thickness',
        unit: 'nm',
        kind: 'number',
        role: 'result'
      },
      {
        key: 'gpc',
        name: 'GPC',
        unit: 'Å/cycle',
        kind: 'number',
        role: 'calculated'
      }
    ];
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PlotControls
          columns={columns}
          canGroupByStudy
          settings={{ ...SETTINGS, x: 'temp', y: 'thick' }}
          onChange={vi.fn()}
        />
      </NextIntlClientProvider>
    );

    await userEvent.click(screen.getByLabelText('Y axis'));
    const listbox = await screen.findByRole('listbox');
    const labels = Array.from(
      listbox.querySelectorAll('[role="option"], [data-slot="select-label"]')
    ).map(node => node.textContent);
    expect(labels).toEqual([
      'Results',
      'Thickness (nm)',
      'Calculated',
      'GPC (Å/cycle)',
      'Parameters',
      'Temperature (°C)'
    ]);
  });

  it('offers only columns of numbers for the X axis, with their units', async () => {
    renderControls(false);
    await userEvent.click(screen.getByLabelText('X axis'));

    const options = (await screen.findAllByRole('option')).map(
      option => option.textContent
    );
    expect(options).toEqual(['Power (W)', 'Thickness (nm)']);
  });

  it('offers study grouping only when the rows have studies', async () => {
    renderControls(false);
    await userEvent.click(screen.getByLabelText('Colour by'));
    expect(
      (await screen.findAllByRole('option')).map(o => o.textContent)
    ).toEqual(['Nothing', 'Gas', 'Power (W)', 'Thickness (nm)']);
  });

  it('offers study grouping for an experiment', async () => {
    renderControls(true);
    await userEvent.click(screen.getByLabelText('Colour by'));
    expect(
      (await screen.findAllByRole('option')).map(o => o.textContent)
    ).toEqual(['Nothing', 'Study', 'Gas', 'Power (W)', 'Thickness (nm)']);
  });

  it('reports the chosen error column and the log toggles', async () => {
    const onChange = renderControls(true);

    await userEvent.click(screen.getByLabelText('Error bars'));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Thickness (nm)' })
    );
    expect(onChange).toHaveBeenLastCalledWith({
      ...SETTINGS,
      error: 'thickness'
    });

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Logarithmic Y' })
    );
    expect(onChange).toHaveBeenLastCalledWith({ ...SETTINGS, logY: true });
  });
});
