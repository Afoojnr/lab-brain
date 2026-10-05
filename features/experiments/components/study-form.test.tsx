import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/create-study', () => ({ createStudyAction: vi.fn() }));
vi.mock('../actions/update-study', () => ({ updateStudyAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { createStudyAction } from '../actions/create-study';
import { updateStudyAction } from '../actions/update-study';
import { StudyForm } from './study-form';

const form = en.studies.form;

const renderForm = (study?: {
  id: string;
  name: string;
  description: string | null;
}) => {
  const onSaved = vi.fn();

  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <StudyForm
        projectId="project-1"
        experimentId="experiment-1"
        otherNames={['TEB study']}
        study={study}
        onCancel={vi.fn()}
        onSaved={onSaved}
      />
    </NextIntlClientProvider>
  );

  return { user: userEvent.setup(), onSaved };
};

describe('StudyForm', () => {
  it('calls the description "Description", not a purpose', () => {
    renderForm();

    expect(screen.getByLabelText('Description')).toBeVisible();
    expect(screen.queryByLabelText('Purpose')).not.toBeInTheDocument();
  });

  it('rejects a name another study in the experiment already has', async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'teb STUDY');
    await user.click(screen.getByRole('button', { name: form.submit }));

    expect(await screen.findByText(form.errors.nameDuplicate)).toBeVisible();
    expect(createStudyAction).not.toHaveBeenCalled();
  });

  it('edits an existing study through the update action, not the create one', async () => {
    vi.mocked(updateStudyAction).mockResolvedValueOnce(true);
    const { user, onSaved } = renderForm({
      id: 'study-1',
      name: 'Pulse study',
      description: null
    });

    expect(screen.getByLabelText(form.nameLabel)).toHaveValue('Pulse study');
    await user.type(screen.getByLabelText('Description'), 'Some free notes');
    await user.click(screen.getByRole('button', { name: form.saveSubmit }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(updateStudyAction).toHaveBeenCalledWith(
      'project-1',
      'experiment-1',
      'study-1',
      { name: 'Pulse study', description: 'Some free notes' }
    );
    expect(createStudyAction).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Study Pulse study updated');
  });

  it('shows an error toast and stays open when saving fails', async () => {
    vi.mocked(updateStudyAction).mockResolvedValueOnce(false);
    const { user, onSaved } = renderForm({
      id: 'study-1',
      name: 'Pulse study',
      description: null
    });

    await user.click(screen.getByRole('button', { name: form.saveSubmit }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
