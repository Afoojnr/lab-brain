import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageTabs } from './page-tabs';

const TABS = [
  { value: 'protocol', label: 'Protocol', href: '/x?tab=protocol' },
  { value: 'setup', label: 'Setup', href: '/x?tab=setup' },
  { value: 'samples', label: 'Samples', count: 23, href: '/x?tab=samples' },
  { value: 'plots', label: 'Plots', count: 0, href: '/x?tab=plots' }
];

const show = (active = 'samples') =>
  render(<PageTabs label="Sections" tabs={TABS} active={active} />);

describe('PageTabs', () => {
  it('lists every tab as a link to its own address, in order', () => {
    show();

    const links = screen
      .getByRole('navigation', { name: 'Sections' })
      .querySelectorAll('a');
    expect([...links].map(link => link.getAttribute('href'))).toEqual([
      '/x?tab=protocol',
      '/x?tab=setup',
      '/x?tab=samples',
      '/x?tab=plots'
    ]);
  });

  it('marks only the current tab', () => {
    show('setup');

    expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: /^Samples/ })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('reads a count after its label, including a count of 0', () => {
    show();

    expect(
      screen.getByRole('link', { name: 'Samples 23' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plots 0' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Protocol' })).toBeInTheDocument();
  });
});
