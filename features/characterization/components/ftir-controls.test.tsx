import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import { defaultFtirSettings } from '../techniques/ftir/defaults';
import type { FtirSettings } from '../techniques/ftir/types';
import { FtirControls } from './ftir-controls';

const t = en.analysis.ftir.controls;

const setup = (
  settings: FtirSettings = defaultFtirSettings(),
  problem: 'flat' | 'noReference' | 'zeroReference' | null = null
) => {
  const onChange = vi.fn();
  const onDetect = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FtirControls
        settings={settings}
        onChange={onChange}
        guess={{ reading: 'transmittance', reason: 'percentTransmittance' }}
        isStacked={false}
        isReversed
        onReverseChange={vi.fn()}
        normaliseProblem={problem}
        onDetect={onDetect}
      />
    </NextIntlClientProvider>
  );

  return { onChange, onDetect, user: userEvent.setup() };
};

describe('FtirControls', () => {
  it('says why it guessed what it did, and offers the conversion to absorbance for transmittance', () => {
    setup();

    expect(screen.getByText(t.guess.percentTransmittance)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: t.convert })
    ).toBeInTheDocument();
  });

  it('does not offer the conversion when the values are absorbance already', () => {
    setup({ ...defaultFtirSettings(), reading: 'absorbance' });

    expect(screen.queryByRole('checkbox', { name: t.convert })).toBeNull();
    expect(screen.queryByText(t.guess.percentTransmittance)).toBeNull();
  });

  it('asks for the reference peak only for that normalisation, and for a range only for min–max', () => {
    const peak = defaultFtirSettings();
    peak.normalisation.method = 'peak';
    setup(peak);

    expect(screen.getByLabelText(t.referencePosition)).toBeInTheDocument();
    expect(screen.queryByLabelText(t.rangeFrom)).toBeNull();
  });

  it('tells the user when a normalisation could not be applied', () => {
    setup(defaultFtirSettings(), 'noReference');

    expect(screen.getByRole('alert')).toHaveTextContent(t.problems.noReference);
  });

  it('turns sensitivity into a fraction and detects peaks on request', async () => {
    const { onChange, onDetect, user } = setup();

    const field = screen.getByLabelText(t.sensitivity);
    await user.clear(field);
    await user.type(field, '2');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detection: expect.objectContaining({ sensitivity: 0.02 })
      })
    );

    await user.click(screen.getByRole('button', { name: t.detect }));
    expect(onDetect).toHaveBeenCalled();
  });
});
