import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/ftir-bonds', () => ({ saveBondAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { saveBondAction } from '../actions/ftir-bonds';
import { FtirBondDialog } from './ftir-bond-dialog';

const t = en.analysis.ftir.bonds;
// Made-up rows for tests only: not real assignments.
const OLD = { id: 'o', bond: 'Old', from: 1, to: 2, source: '' };

const open = async (props: { bond?: typeof OLD } = {}) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FtirBondDialog bonds={[OLD]} {...props} />
    </NextIntlClientProvider>
  );
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: props.bond ? 'Edit Old' : t.add })
  );

  return user;
};

beforeEach(() => vi.clearAllMocks());

describe('FtirBondDialog', () => {
  it('saves a bond with its range and source, reading a decimal comma', async () => {
    vi.mocked(saveBondAction).mockResolvedValue({ ok: true });
    const user = await open();

    await user.type(await screen.findByLabelText(t.bond), 'Range A');
    await user.type(screen.getByLabelText(t.from), '790,5');
    await user.type(screen.getByLabelText(t.to), '810');
    await user.type(screen.getByLabelText(t.source), 'a test');
    await user.click(screen.getByRole('button', { name: t.save }));

    expect(saveBondAction).toHaveBeenCalledWith(
      { bond: 'Range A', from: 790.5, to: 810, source: 'a test' },
      undefined
    );
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith(t.saved));
  });

  it('takes an empty To as a single position', async () => {
    vi.mocked(saveBondAction).mockResolvedValue({ ok: true });
    const user = await open();

    await user.type(await screen.findByLabelText(t.bond), 'Single B');
    await user.type(screen.getByLabelText(t.from), '1390');
    await user.click(screen.getByRole('button', { name: t.save }));

    expect(saveBondAction).toHaveBeenCalledWith(
      { bond: 'Single B', from: 1390, to: 1390, source: '' },
      undefined
    );
  });

  it('says what is wrong in the field and sends nothing: text, a backwards range, a repeat', async () => {
    const user = await open();
    const bond = await screen.findByLabelText(t.bond);

    await user.type(bond, 'X');
    await user.type(screen.getByLabelText(t.from), 'about 5');
    await user.click(screen.getByRole('button', { name: t.save }));
    expect(await screen.findByText(t.errors.notNumber)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(t.from));
    await user.type(screen.getByLabelText(t.from), '900');
    await user.type(screen.getByLabelText(t.to), '800');
    await user.click(screen.getByRole('button', { name: t.save }));
    expect(await screen.findByText(t.errors.rangeOrder)).toBeInTheDocument();

    await user.clear(bond);
    await user.type(bond, 'old');
    await user.clear(screen.getByLabelText(t.from));
    await user.type(screen.getByLabelText(t.from), '1');
    await user.clear(screen.getByLabelText(t.to));
    await user.type(screen.getByLabelText(t.to), '2');
    await user.click(screen.getByRole('button', { name: t.save }));
    expect(await screen.findByText(t.errors.duplicate)).toBeInTheDocument();

    expect(saveBondAction).not.toHaveBeenCalled();
  });

  it('starts an edit from the bond and saves it under its id, without calling itself a repeat', async () => {
    vi.mocked(saveBondAction).mockResolvedValue({ ok: true });
    const user = await open({ bond: OLD });

    expect(await screen.findByLabelText(t.bond)).toHaveValue('Old');
    await user.click(screen.getByRole('button', { name: t.save }));

    expect(saveBondAction).toHaveBeenCalledWith(
      { bond: 'Old', from: 1, to: 2, source: '' },
      'o'
    );
  });

  it('keeps the dialog open and says so when the server refuses', async () => {
    vi.mocked(saveBondAction).mockResolvedValue({
      ok: false,
      error: 'tooMany'
    });
    const user = await open();

    await user.type(await screen.findByLabelText(t.bond), 'New');
    await user.type(screen.getByLabelText(t.from), '5');
    await user.click(screen.getByRole('button', { name: t.save }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
