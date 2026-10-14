import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { DeleteDialog } from './delete-dialog';
import type { DeleteDetails } from './delete-dialog';

const t = en.experiments.delete;

const Harness = ({ details }: { details: DeleteDetails }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        reopen
      </button>
      <DeleteDialog
        details={details}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
};

const show = (changes: Partial<DeleteDetails> = {}) => {
  const onDelete = vi.fn().mockResolvedValue(true);
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Harness
        details={{
          kind: 'experiment',
          counts: {
            experiments: 1,
            samples: 23,
            characterizations: 4,
            files: 12,
            columns: 6,
            studies: 3
          },
          hasSavedData: true,
          confirmName: 'Deposition',
          onDelete,
          afterHref: '/projects/p1',
          ...changes
        }}
      />
    </NextIntlClientProvider>
  );

  return { onDelete, user: userEvent.setup() };
};

beforeEach(() => vi.clearAllMocks());

describe('DeleteDialog', () => {
  it('asks first, naming the record kind, and deletes nothing by opening', async () => {
    const { onDelete } = show();

    expect(
      await screen.findByRole('heading', { name: t.experiment.title })
    ).toBeInTheDocument();
    expect(screen.getByText(t.irreversible)).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('lists what goes with it, with counts, leaving out zeros and the record itself', async () => {
    show({
      counts: { experiments: 1, samples: 4, characterizations: 0, files: 12 }
    });

    expect(await screen.findByText('4 samples')).toBeInTheDocument();
    expect(
      screen.getByText('12 attached files (also removed from storage)')
    ).toBeInTheDocument();
    expect(screen.getByText(t.counts.savedPlots)).toBeInTheDocument();
    expect(screen.queryByText(/measurement/)).toBeNull();
    expect(screen.queryByText('1 experiment')).toBeNull();
  });

  it('keeps Delete disabled until the exact name is typed', async () => {
    const { onDelete, user } = show();
    const confirm = await screen.findByRole('button', {
      name: t.experiment.confirm
    });
    const name = screen.getByLabelText(t.nameLabel);

    expect(confirm).toBeDisabled();
    await user.type(name, 'deposition');
    expect(confirm).toBeDisabled();
    await user.clear(name);
    await user.type(name, 'Deposition');
    expect(confirm).toBeEnabled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('sends the typed name, then confirms and goes to the parent page', async () => {
    const { onDelete, user } = show();
    await user.type(await screen.findByLabelText(t.nameLabel), 'Deposition');
    await user.click(
      screen.getByRole('button', { name: t.experiment.confirm })
    );

    expect(onDelete).toHaveBeenCalledWith('Deposition');
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(t.experiment.done)
    );
    expect(router.push).toHaveBeenCalledWith('/projects/p1');
  });

  it('stays and says so when the server refuses', async () => {
    const { onDelete, user } = show();
    onDelete.mockResolvedValue(false);
    await user.type(await screen.findByLabelText(t.nameLabel), 'Deposition');
    await user.click(
      screen.getByRole('button', { name: t.experiment.confirm })
    );

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(t.failed));
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('asks once, with no name, for a sample; cancel closes and a reopened dialog starts clean', async () => {
    const { onDelete, user } = show({
      kind: 'sample',
      confirmName: undefined,
      counts: { characterizations: 2, files: 5 }
    });

    expect(
      await screen.findByRole('button', { name: t.sample.confirm })
    ).toBeEnabled();
    expect(screen.queryByLabelText(t.nameLabel)).toBeNull();
    await user.click(screen.getByRole('button', { name: t.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('forgets a typed name when cancelled', async () => {
    const { user } = show({ kind: 'project', confirmName: 'ALD of BxC' });

    await user.type(await screen.findByLabelText(t.nameLabel), 'ALD');
    await user.click(screen.getByRole('button', { name: t.cancel }));
    await user.click(screen.getByRole('button', { name: 'reopen' }));

    expect(await screen.findByLabelText(t.nameLabel)).toHaveValue('');
  });

  it('says what a study delete keeps instead of listing what goes', async () => {
    show({ kind: 'study', confirmName: undefined, sampleCount: 3 });

    expect(
      await screen.findByText(
        '3 samples keep all their data and only lose the tag.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(t.removes)).toBeNull();
  });

  it('shows the name to type in bold, so it stands out from the instruction', async () => {
    show({ kind: 'project', confirmName: 'ALD of BxC' });

    const name = await screen.findByText('ALD of BxC', { selector: 'strong' });
    expect(name).toBeInTheDocument();
    expect(name.parentElement).toHaveTextContent('Type ALD of BxC to confirm.');
  });
});
