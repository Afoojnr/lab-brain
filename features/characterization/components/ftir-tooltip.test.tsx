import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { en } from '@/messages/en';

import { FtirTooltip } from './ftir-tooltip';

const SPECTRA = [
  {
    id: 'a',
    label: 'A.csv',
    color: '#2563eb',
    points: [
      { x: 1100, y: 40 },
      { x: 1102, y: 41 }
    ]
  },
  {
    id: 'b',
    label: 'B.csv',
    color: '#dc2626',
    points: [
      { x: 1100, y: 70 },
      { x: 1140, y: 72 }
    ]
  }
];

const show = (wavenumber: number, isActive = true) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FtirTooltip
        isActive={isActive}
        wavenumber={wavenumber}
        spectra={SPECTRA}
      />
    </NextIntlClientProvider>
  );

describe('FtirTooltip', () => {
  it('names the wavenumber first, then each spectrum value at that wavenumber', () => {
    show(1101);

    expect(screen.getByText('1101 cm⁻¹')).toBeInTheDocument();
    expect(screen.getByText('A.csv')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
  });

  it('says where a spectrum has its nearest point when it has none at that wavenumber', () => {
    show(1135);

    expect(screen.getByText(/\(at 1140 cm⁻¹\)/)).toBeInTheDocument();
    expect(screen.getByText(/72/)).toBeInTheDocument();
    // The other spectrum's nearest point is 33 cm⁻¹ away: it says so too.
    expect(screen.getByText(/\(at 1102 cm⁻¹\)/)).toBeInTheDocument();
  });

  it('shows nothing when the pointer is not on the chart', () => {
    const { container } = show(1101, false);

    expect(container).toBeEmptyDOMElement();
  });
});
