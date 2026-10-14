import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/ftir-bonds', () => ({ importBondsAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { importBondsAction } from '../actions/ftir-bonds';
import { FtirBondImport } from './ftir-bond-import';

const t = en.analysis.ftir.bonds.import;
// Made-up rows for tests only: not real assignments.
const EXISTING = [{ id: 'x', bond: 'Old', from: 1, to: 2, source: '' }];
const PASTED =
  'Bond\tFrom (cm-1)\tTo (cm-1)\tSource\nRange A\t790\t810\ta test\nSingle B\t1390\t\t\nBad\tabout 5\t\t';

const setup = async (bonds = EXISTING) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FtirBondImport bonds={bonds} />
    </NextIntlClientProvider>
  );
  const user = userEvent.setup();
  await user.click(screen.getByLabelText(t.paste));
  await user.paste(PASTED);
  await user.click(screen.getByRole('button', { name: t.read }));

  return user;
};

beforeEach(() => vi.clearAllMocks());

describe('FtirBondImport', () => {
  it('says what the format is and offers a template', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <FtirBondImport bonds={[]} />
      </NextIntlClientProvider>
    );

    expect(
      screen.getByText(/The first row names the columns/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t.template })
    ).toBeInTheDocument();
  });

  it('shows the good rows and the row and column of each bad one, before anything is saved', async () => {
    await setup();

    expect(screen.getByText('2 bonds are ready to add.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Row 4, From: “about 5” is not a number.'
    );
    expect(importBondsAction).not.toHaveBeenCalled();
  });

  it('adds only the good rows, as an addition, and confirms', async () => {
    vi.mocked(importBondsAction).mockResolvedValue({ ok: true, count: 2 });
    const user = await setup();

    await user.click(screen.getByRole('button', { name: 'Add 2 bonds' }));

    expect(importBondsAction).toHaveBeenCalledWith({
      mode: 'add',
      bonds: [
        { bond: 'Range A', from: 790, to: 810, source: 'a test' },
        { bond: 'Single B', from: 1390, to: 1390, source: '' }
      ]
    });
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('2 bonds added')
    );
  });

  it('replaces the table only after a second confirmation', async () => {
    vi.mocked(importBondsAction).mockResolvedValue({ ok: true, count: 2 });
    const user = await setup();

    await user.click(
      screen.getByRole('button', { name: 'Replace the table with 2 bonds' })
    );
    expect(importBondsAction).not.toHaveBeenCalled();
    expect(
      screen.getByText('This removes the 1 bond now in the table. Replace it?')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: t.confirmYes }));

    expect(importBondsAction).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'replace' })
    );
  });

  it('shows an error and keeps the preview when the server refuses', async () => {
    vi.mocked(importBondsAction).mockResolvedValue({
      ok: false,
      error: 'duplicate'
    });
    const user = await setup();

    await user.click(screen.getByRole('button', { name: 'Add 2 bonds' }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(t.failed));
    expect(screen.getByText('2 bonds are ready to add.')).toBeInTheDocument();
  });

  it('reports a row that repeats one already in the table, and a missing header', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <FtirBondImport bonds={EXISTING} />
      </NextIntlClientProvider>
    );
    const user = userEvent.setup();
    await user.click(screen.getByLabelText(t.paste));
    await user.paste('Bond,From,To\nOld,1,2');
    await user.click(screen.getByRole('button', { name: t.read }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Row 2: this bond and range are already in the table.'
    );

    await user.clear(screen.getByLabelText(t.paste));
    await user.paste('Range A,790,810');
    await user.click(screen.getByRole('button', { name: t.read }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'the first row must name the columns'
    );
  });
});
