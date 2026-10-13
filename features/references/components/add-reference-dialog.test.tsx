import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/add-reference', () => ({ addReferenceAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { addReferenceAction } from '../actions/add-reference';
import { AddReferenceDialog } from './add-reference-dialog';

const t = en.references;

const open = async (isDisabled = false) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AddReferenceDialog projectId="p1" isDisabled={isDisabled} />
    </NextIntlClientProvider>
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: t.tab.add }));

  return user;
};

beforeEach(() => vi.clearAllMocks());

describe('AddReferenceDialog', () => {
  it('asks for a PDF first, then a link or pasted text when chosen', async () => {
    const user = await open();

    expect(await screen.findByLabelText(t.add.file)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t.add.kinds.link }));
    expect(screen.getByLabelText(t.add.url)).toBeInTheDocument();
    expect(screen.queryByLabelText(t.add.file)).toBeNull();
    await user.click(screen.getByRole('button', { name: t.add.kinds.text }));
    expect(screen.getByLabelText(t.add.text)).toBeInTheDocument();
  });

  it('sends the kind and what was typed, then closes with a confirmation', async () => {
    vi.mocked(addReferenceAction).mockResolvedValueOnce({ ok: true, id: 'r1' });
    const user = await open();

    await user.click(
      await screen.findByRole('button', { name: t.add.kinds.text })
    );
    await user.type(
      screen.getByLabelText(t.add.text),
      'Plasma pulse changes growth per cycle in boron carbide films.'
    );
    await user.type(
      screen.getByLabelText(t.add.note),
      'Shows the pulse effect'
    );
    await user.click(screen.getByRole('button', { name: t.add.submit }));

    await waitFor(() => expect(addReferenceAction).toHaveBeenCalled());
    const [projectId, formData] = vi.mocked(addReferenceAction).mock.calls[0];
    expect(projectId).toBe('p1');
    expect(formData.get('kind')).toBe('text');
    expect(formData.get('text')).toContain('Plasma pulse');
    expect(formData.get('note')).toBe('Shows the pulse effect');
    expect(toast.success).toHaveBeenCalledWith(t.add.done);
  });

  it('shows the reason in a toast and stays open when the reference cannot be added', async () => {
    vi.mocked(addReferenceAction).mockResolvedValueOnce({
      ok: false,
      error: 'linkBlocked'
    });
    const user = await open();

    await user.click(
      await screen.findByRole('button', { name: t.add.kinds.link })
    );
    await user.type(screen.getByLabelText(t.add.url), 'http://10.0.0.1/a');
    await user.click(screen.getByRole('button', { name: t.add.submit }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(t.errors.linkBlocked)
    );
    expect(screen.getByLabelText(t.add.url)).toHaveValue('http://10.0.0.1/a');
  });

  it('puts the limit in the message when the project is full, and disables the button at the limit', async () => {
    vi.mocked(addReferenceAction).mockResolvedValueOnce({
      ok: false,
      error: 'limitReached'
    });
    const user = await open();
    await user.click(
      await screen.findByRole('button', { name: t.add.kinds.text })
    );
    await user.type(screen.getByLabelText(t.add.text), 'x'.repeat(50));
    await user.click(screen.getByRole('button', { name: t.add.submit }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        t.errors.limitReached.replace('{max}', '10')
      )
    );
  });

  it('is disabled when the project has the most references it can hold', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AddReferenceDialog projectId="p1" isDisabled />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('button', { name: t.tab.add })).toBeDisabled();
  });
});

describe('AddReferenceDialog: PDF', () => {
  it('shows the chosen PDF and sends it', async () => {
    vi.mocked(addReferenceAction).mockResolvedValueOnce({ ok: true, id: 'r1' });
    const user = await open();
    const pdf = new File(['%PDF-1.4'], 'paper.pdf', {
      type: 'application/pdf'
    });

    await user.upload(await screen.findByLabelText(t.add.file), pdf);
    expect(screen.getByText(/Chosen: paper\.pdf/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t.add.submit }));

    await waitFor(() => expect(addReferenceAction).toHaveBeenCalled());
    const sent = vi.mocked(addReferenceAction).mock.calls[0][1] as FormData;
    expect(sent.get('kind')).toBe('pdf');
    expect((sent.get('file') as File).name).toBe('paper.pdf');
  });

  it('asks for a PDF instead of sending nothing', async () => {
    const user = await open();

    await screen.findByLabelText(t.add.file);
    await user.click(screen.getByRole('button', { name: t.add.submit }));

    expect(toast.error).toHaveBeenCalledWith(t.errors.fileMissing);
    expect(addReferenceAction).not.toHaveBeenCalled();
  });
});
