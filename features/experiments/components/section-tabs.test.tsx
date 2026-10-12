import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import { SectionTabs } from './section-tabs';

// An async server component: await it, then render what it returns.
vi.mock('next-intl/server', () => ({
  getTranslations: async () => {
    const lookup = (key: string) =>
      key
        .split('.')
        .reduce<unknown>(
          (value, part) => (value as Record<string, unknown>)[part],
          en.experiments.sections
        ) as string;
    return lookup;
  }
}));

const PATH = '/projects/p1/experiments/e1';

const renderTabs = async (
  active: 'samples' | 'plots' | 'protocol' | 'setup',
  hasPlots = true
) => {
  const element = await SectionTabs({
    experimentPath: PATH,
    active,
    hasPlots,
    counts: { samples: 23, plots: 2 }
  });
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {element}
    </NextIntlClientProvider>
  );
};

describe('SectionTabs', () => {
  it('lists the tabs as Protocol, Setup, Samples, Plots, links each with its tab and marks the current one', async () => {
    await renderTabs('protocol');

    expect(
      screen
        .getAllByRole('link')
        .map(link => link.textContent?.replace(/\s*\d+$/, ''))
    ).toEqual(['Protocol', 'Setup', 'Samples', 'Plots']);
    expect(screen.getByRole('link', { name: /^Samples/ })).toHaveAttribute(
      'href',
      `${PATH}?tab=samples`
    );
    expect(screen.getByRole('link', { name: /^Plots/ })).toHaveAttribute(
      'href',
      `${PATH}?tab=plots`
    );
    expect(screen.getByRole('link', { name: 'Protocol' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Setup' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('shows the sample and plot counts in the tabs', async () => {
    await renderTabs('samples');

    expect(
      screen.getByRole('link', { name: 'Samples 23' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plots 2' })).toBeInTheDocument();
  });

  it('leaves the Plots tab out when the page does not provide saved plots', async () => {
    await renderTabs('samples', false);

    expect(screen.queryByRole('link', { name: /^Plots/ })).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
});
