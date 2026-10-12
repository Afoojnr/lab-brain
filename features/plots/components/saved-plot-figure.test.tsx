import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import type { PlotTable } from '../from-table';
import { DEFAULT_STYLE } from '../style';
import type { SavedPlotInput } from '../types';
import { SavedPlotFigure } from './saved-plot-figure';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const TABLE: PlotTable = {
  columns: [
    { key: 'a', name: 'Temperature', unit: '°C', kind: 'number' },
    { key: 'b', name: 'Thickness', unit: 'nm', kind: 'number' },
    { key: 'c', name: 'Cycles', unit: null, kind: 'number' }
  ],
  rows: [
    {
      id: '1',
      label: 'A',
      href: null,
      values: { a: 150, b: 40, c: 600 },
      groups: []
    },
    {
      id: '2',
      label: 'B',
      href: null,
      values: { a: 200, b: 50, c: 800 },
      groups: []
    },
    {
      id: '3',
      label: 'C',
      href: null,
      values: { a: 250, b: 60, c: 600 },
      groups: []
    }
  ]
};
const PLOT: Omit<SavedPlotInput, 'name'> = {
  settings: {
    x: 'a',
    y: 'b',
    error: null,
    group: { type: 'column', key: 'c' },
    logX: false,
    logY: false
  },
  filters: [],
  untickedIds: [],
  style: { ...DEFAULT_STYLE, title: 'Growth' }
};

const renderFigure = (plot = PLOT) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SavedPlotFigure
        table={TABLE}
        plot={plot}
        size={{ width: 400, height: 250 }}
      />
    </NextIntlClientProvider>
  );

describe('SavedPlotFigure', () => {
  it('draws the saved plot: its title, and a legend with a title for the colours', () => {
    renderFigure();

    expect(screen.getByRole('heading', { name: 'Growth' })).toBeInTheDocument();
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(legend).toHaveTextContent('600');
    expect(legend).toHaveTextContent('800');
    expect(legend.parentElement).toHaveTextContent('Cycles');
  });

  it('honours the saved filters and unticked samples', () => {
    renderFigure({
      ...PLOT,
      filters: [{ type: 'values', key: 'c', values: [800] }]
    });

    // Only one group is left, so there is no legend.
    expect(
      screen.queryByRole('list', { name: 'Legend' })
    ).not.toBeInTheDocument();
  });

  it('says so when the saved plot cannot be drawn any more', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SavedPlotFigure
          table={{ ...TABLE, columns: TABLE.columns.slice(0, 1) }}
          plot={PLOT}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByText(/cannot be opened any more/)).toBeInTheDocument();
  });
});
