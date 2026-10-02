import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/create-project', () => ({ createProjectAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { createProjectAction } from '../actions/create-project';
import { ProjectForm } from './project-form';

const form = en.projects.form;

const renderForm = () => {
  const onCancel = vi.fn();
  const onCreated = vi.fn();

  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ProjectForm onCancel={onCancel} onCreated={onCreated} />
    </NextIntlClientProvider>
  );

  return { user: userEvent.setup(), onCancel, onCreated };
};

const submitButton = () => screen.getByRole('button', { name: form.submit });

describe('ProjectForm', () => {
  it('shows what is wrong and does not submit an empty form', async () => {
    const { user } = renderForm();

    await user.click(submitButton());

    expect(await screen.findByText(form.errors.nameRequired)).toBeVisible();
    expect(screen.getByText(form.errors.codePrefixInvalid)).toBeVisible();
    expect(createProjectAction).not.toHaveBeenCalled();
  });

  it('turns the code prefix into capitals as the user types', async () => {
    const { user } = renderForm();
    const prefixInput = screen.getByLabelText(form.codePrefixLabel);

    await user.type(prefixInput, 'exp');

    expect(prefixInput).toHaveValue('EXP');
  });

  it('creates the project, confirms with a toast and reports it', async () => {
    const { user, onCreated } = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'Alpha');
    await user.type(screen.getByLabelText(form.codePrefixLabel), 'exp');
    await user.click(submitButton());

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(createProjectAction).toHaveBeenCalledWith({
      name: 'Alpha',
      codePrefix: 'EXP',
      protocol: ''
    });
    expect(toast.success).toHaveBeenCalledWith('Project Alpha created');
  });

  it('shows an error toast and does not report success when saving fails', async () => {
    vi.mocked(createProjectAction).mockRejectedValueOnce(new Error('down'));
    const { user, onCreated } = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'Alpha');
    await user.type(screen.getByLabelText(form.codePrefixLabel), 'exp');
    await user.click(submitButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(onCreated).not.toHaveBeenCalled();
  });
});
