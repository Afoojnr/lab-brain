import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/create-project', () => ({ createProjectAction: vi.fn() }));
vi.mock('../actions/update-project', () => ({ updateProjectAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { createProjectAction } from '../actions/create-project';
import { updateProjectAction } from '../actions/update-project';
import { ProjectForm } from './project-form';

const form = en.projects.form;

const renderForm = (
  project?: ComponentProps<typeof ProjectForm>['project']
) => {
  const onCancel = vi.fn();
  const onSaved = vi.fn();

  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ProjectForm project={project} onCancel={onCancel} onSaved={onSaved} />
    </NextIntlClientProvider>
  );

  return { user: userEvent.setup(), onCancel, onSaved };
};

const submitButton = () => screen.getByRole('button', { name: form.submit });

describe('ProjectForm', () => {
  it('shows what is wrong and does not submit an empty form', async () => {
    const { user } = renderForm();

    await user.click(submitButton());

    expect(await screen.findByText(form.errors.nameRequired)).toBeVisible();
    expect(createProjectAction).not.toHaveBeenCalled();
  });

  it('creates the project, confirms with a toast and reports it', async () => {
    const { user, onSaved } = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'Alpha');
    await user.click(submitButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(createProjectAction).toHaveBeenCalledWith({
      name: 'Alpha',
      description: ''
    });
    expect(toast.success).toHaveBeenCalledWith('Project Alpha created');
  });

  it('shows an error toast and does not report success when saving fails', async () => {
    vi.mocked(createProjectAction).mockRejectedValueOnce(new Error('down'));
    const { user, onSaved } = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'Alpha');
    await user.click(submitButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('edits an existing project through the update action, not the create one', async () => {
    vi.mocked(updateProjectAction).mockResolvedValueOnce(true);
    const { user, onSaved } = renderForm({
      id: 'project-1',
      name: 'Alpha',
      description: null
    });

    expect(screen.getByLabelText(form.nameLabel)).toHaveValue('Alpha');
    await user.type(
      screen.getByLabelText(form.descriptionLabel),
      'What it is about'
    );
    await user.click(screen.getByRole('button', { name: form.saveSubmit }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(updateProjectAction).toHaveBeenCalledWith('project-1', {
      name: 'Alpha',
      description: 'What it is about'
    });
    expect(createProjectAction).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Project Alpha updated');
  });
});
