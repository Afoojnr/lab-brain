import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import type { AnalysisValue } from '../types';
import { ResultsPanel } from './results-panel';

const t = en.analysis.results;

const VALUES: AnalysisValue[] = [
  { id: 'ratio', label: 'B/N', unit: null, value: 1.5 },
  { id: 'el:B', label: 'B', unit: 'at.%', value: 50 }
];
const COLUMNS = [{ id: 'c1', name: 'B/N', unit: null }];

const renderPanel = (
  overrides: Partial<Parameters<typeof ResultsPanel>[0]> = {}
) => {
  const props = {
    values: VALUES,
    columns: COLUMNS,
    currentValues: { c1: 1.4 },
    selectedIds: ['ratio', 'el:B'],
    targets: {},
    denominator: 'N',
    isBusy: false,
    onChange: vi.fn(),
    onApply: vi.fn(),
    onSave: vi.fn(),
    ...overrides
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ResultsPanel {...props} />
    </NextIntlClientProvider>
  );

  return { props, user: userEvent.setup() };
};

describe('ResultsPanel', () => {
  it('sends the targets it shows, even for values the user never touched', async () => {
    const { props, user } = renderPanel();

    await user.click(
      screen.getByRole('button', {
        name: t.apply.replace(
          '{count, plural, one {# value} other {# values}}',
          '2 values'
        )
      })
    );

    // B/N matches the existing column of that name; B has none, so a new column.
    expect(props.onApply).toHaveBeenCalledWith({
      ratio: { type: 'column', columnId: 'c1' },
      'el:B': { type: 'new', name: 'B', unit: 'at.%' }
    });
  });

  it('sends the same targets when saving the choices', async () => {
    const { props, user } = renderPanel();

    await user.click(screen.getByRole('button', { name: t.save }));

    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ ratio: { type: 'column', columnId: 'c1' } })
    );
  });

  it('shows what a value would replace, and says when nothing changes', () => {
    renderPanel({ currentValues: { c1: 1.5 } });

    expect(screen.getByText(t.noChange)).toBeVisible();
  });

  it('explains a ratio that could not be computed', () => {
    renderPanel({
      values: [
        { id: 'ratio', label: 'B/N', unit: null, value: 0, flag: 'unavailable' }
      ],
      selectedIds: ['ratio']
    });

    expect(screen.getByText(/no N measured/)).toBeVisible();
  });

  it('cannot send with nothing ticked or two values for one column', async () => {
    renderPanel({ selectedIds: [] });
    expect(screen.getByRole('button', { name: /Send/ })).toBeDisabled();
    expect(screen.getByText(t.noneSelected)).toBeVisible();
  });
});
