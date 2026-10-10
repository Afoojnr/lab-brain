import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import type { PlotTable } from '../from-table';
import { PlotView } from './plot-view';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const TABLE: PlotTable = {
  columns: [
    { key: 'a', name: 'Power', unit: 'W', kind: 'number' },
    { key: 'b', name: 'Thickness', unit: 'nm', kind: 'number' }
  ],
  rows: [
    {
      id: '1',
      label: 'ALD001',
      href: null,
      values: { a: 100, b: 10 },
      groups: []
    },
    { id: '2', label: 'ALD002', href: null, values: { a: 200 }, groups: [] },
    {
      id: '3',
      label: 'ALD003',
      href: null,
      values: { a: -5, b: 12 },
      groups: []
    }
  ]
};

const renderView = (table: PlotTable) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PlotView
        table={table}
        canGroupByStudy={false}
        notEnoughNumbers="Need two"
      />
    </NextIntlClientProvider>
  );

describe('PlotView', () => {
  it('counts the plotted and the left-out samples', () => {
    renderView(TABLE);

    expect(
      screen.getByText('2 samples plotted · 1 left out (no value)', {
        exact: false
      })
    ).toBeInTheDocument();
  });

  it('lists the plotted values in a table, with no row for a missing value', () => {
    renderView(TABLE);

    expect(screen.getByText('ALD001')).toBeInTheDocument();
    expect(screen.getByText('ALD003')).toBeInTheDocument();
    expect(screen.queryByText('ALD002')).not.toBeInTheDocument();
  });

  it('says so when there are fewer than two columns of numbers', () => {
    renderView({ ...TABLE, columns: TABLE.columns.slice(0, 1) });

    expect(screen.getByText('Need two')).toBeInTheDocument();
  });

  it('removes an unticked sample from the plot without deleting it, and ticks it back', async () => {
    renderView(TABLE);
    const summary = /\d samples? plotted/;

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Plot ALD001' })
    );
    expect(screen.getByText(summary).textContent).toContain('1 sample plotted');
    expect(screen.getByText(summary).textContent).toContain('1 unticked');
    expect(screen.getByText('ALD001')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByText(summary).textContent).toContain(
      '2 samples plotted'
    );
  });

  it('selects none, then ticks one back', async () => {
    renderView(TABLE);

    await userEvent.click(screen.getByRole('button', { name: 'Select none' }));
    expect(screen.getByText(/0 samples plotted/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Plot ALD003' })
    );
    expect(screen.getByText(/1 sample plotted/)).toBeInTheDocument();
  });

  it('keeps only the samples that pass a filter and counts the rest', async () => {
    renderView({
      ...TABLE,
      columns: [
        ...TABLE.columns,
        { key: 'c', name: 'Cycles', unit: null, kind: 'number' }
      ],
      rows: [
        {
          id: '1',
          label: 'ALD001',
          href: null,
          values: { a: 1, b: 1, c: 600 },
          groups: []
        },
        {
          id: '2',
          label: 'ALD002',
          href: null,
          values: { a: 2, b: 2, c: 800 },
          groups: []
        },
        {
          id: '3',
          label: 'ALD003',
          href: null,
          values: { a: 3, b: 3, c: 600 },
          groups: []
        }
      ]
    });

    await userEvent.click(screen.getByLabelText('Add a filter'));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Cycles' })
    );
    await userEvent.click(screen.getByRole('checkbox', { name: '600' }));

    expect(screen.getByText(/2 samples plotted/).textContent).toContain(
      '1 left out by filters'
    );
    expect(screen.queryByText('ALD002')).not.toBeInTheDocument();
  });

  it('shows a title typed in Customise above the chart', async () => {
    renderView(TABLE);

    expect(
      screen.queryByRole('heading', { name: 'My figure' })
    ).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Plot title'), 'My figure');
    expect(
      screen.getByRole('heading', { name: 'My figure' })
    ).toBeInTheDocument();
  });
});
