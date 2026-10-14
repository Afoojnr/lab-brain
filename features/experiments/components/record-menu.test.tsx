import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { RecordMenu } from './record-menu';
import type { DeleteDetails } from './delete-dialog';

const t = en.experiments.delete;

const show = (
  edit: Parameters<typeof RecordMenu>[0]['edit'],
  withDelete = true
) => {
  const onDelete = vi.fn().mockResolvedValue(true);
  const details: DeleteDetails | undefined = withDelete
    ? {
        kind: 'project',
        counts: { experiments: 2, samples: 5 },
        confirmName: 'ALD of BxC',
        onDelete,
        afterHref: '/'
      }
    : undefined;
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RecordMenu edit={edit} details={details} />
    </NextIntlClientProvider>
  );

  return { onDelete, user: userEvent.setup() };
};

beforeEach(() => vi.clearAllMocks());

describe('RecordMenu', () => {
  it('holds Edit and Delete behind a More actions button, open on request only', async () => {
    const { user } = show({ label: 'Edit project', onSelect: vi.fn() });

    expect(
      screen.getByRole('button', { name: t.moreActions })
    ).toBeInTheDocument();
    expect(screen.queryByRole('menuitem')).toBeNull();
    await user.click(screen.getByRole('button', { name: t.moreActions }));

    expect(
      await screen.findByRole('menuitem', { name: 'Edit project' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Delete project' })
    ).toBeInTheDocument();
  });

  it('runs Edit when chosen, or goes to its page when it is a link', async () => {
    const onSelect = vi.fn();
    const { user } = show({ label: 'Edit project', onSelect });
    await user.click(screen.getByRole('button', { name: t.moreActions }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Edit project' })
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('links Edit to its page when given one', async () => {
    const { user } = show({
      label: 'Edit',
      href: '/projects/p/samples/s/edit'
    });
    await user.click(screen.getByRole('button', { name: t.moreActions }));

    expect(
      await screen.findByRole('menuitem', { name: 'Edit' })
    ).toHaveAttribute('href', '/projects/p/samples/s/edit');
  });

  it('opens the confirmation from Delete, and deletes nothing yet', async () => {
    const { onDelete, user } = show({
      label: 'Edit project',
      onSelect: vi.fn()
    });

    await user.click(screen.getByRole('button', { name: t.moreActions }));
    await user.click(
      await screen.findByRole('menuitem', { name: t.project.menuItem })
    );

    expect(
      await screen.findByRole('heading', { name: t.project.title })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t.project.confirm })
    ).toBeDisabled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('has no Delete item when the page cannot delete', async () => {
    const { user } = show({ label: 'Edit project', onSelect: vi.fn() }, false);
    await user.click(screen.getByRole('button', { name: t.moreActions }));

    expect(
      await screen.findByRole('menuitem', { name: 'Edit project' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: t.project.menuItem })
    ).toBeNull();
  });
});
