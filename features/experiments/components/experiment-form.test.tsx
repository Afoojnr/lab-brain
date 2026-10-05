import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../actions/create-experiment', () => ({
  createExperimentAction: vi.fn()
}));
vi.mock('../actions/update-experiment', () => ({
  updateExperimentAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { createExperimentAction } from '../actions/create-experiment';
import { updateExperimentAction } from '../actions/update-experiment';
import { ExperimentForm } from './experiment-form';

const form = en.experiments.form;

const renderForm = (otherPrefixes: string[] = ['ALD']) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ExperimentForm
        projectId="project-1"
        otherPrefixes={otherPrefixes}
        onCancel={vi.fn()}
      />
    </NextIntlClientProvider>
  );

  return userEvent.setup();
};

const submitButton = () => screen.getByRole('button', { name: form.submit });

describe('ExperimentForm', () => {
  it('turns the prefix into capitals as the user types', async () => {
    const user = renderForm();
    const prefixInput = screen.getByLabelText(form.codePrefixLabel);

    await user.type(prefixInput, 'psl');

    expect(prefixInput).toHaveValue('PSL');
  });

  it('shows what is wrong and does not submit an empty form', async () => {
    const user = renderForm();

    await user.click(submitButton());

    expect(await screen.findByText(form.errors.nameRequired)).toBeVisible();
    expect(screen.getByText(form.errors.codePrefixInvalid)).toBeVisible();
    expect(createExperimentAction).not.toHaveBeenCalled();
  });

  it('rejects a prefix another experiment in the project already uses', async () => {
    const user = renderForm(['ALD']);

    await user.type(screen.getByLabelText(form.nameLabel), 'Another');
    await user.type(screen.getByLabelText(form.codePrefixLabel), 'ald');
    await user.click(submitButton());

    expect(
      await screen.findByText(form.errors.codePrefixDuplicate)
    ).toBeVisible();
    expect(createExperimentAction).not.toHaveBeenCalled();
  });

  it('creates the experiment, confirms with a toast and opens it', async () => {
    vi.mocked(createExperimentAction).mockResolvedValueOnce('experiment-2');
    const user = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'Paschen law');
    await user.type(screen.getByLabelText(form.codePrefixLabel), 'psl');
    await user.type(
      screen.getByLabelText(form.protocolLabel),
      'Fixed gap, vary pressure.'
    );
    await user.click(submitButton());

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/projects/project-1/experiments/experiment-2'
      )
    );
    expect(createExperimentAction).toHaveBeenCalledWith('project-1', {
      name: 'Paschen law',
      codePrefix: 'PSL',
      protocol: 'Fixed gap, vary pressure.'
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Experiment Paschen law created'
    );
  });

  it('shows an error toast and stays put when saving fails', async () => {
    vi.mocked(createExperimentAction).mockRejectedValueOnce(new Error('down'));
    const user = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'Paschen law');
    await user.type(screen.getByLabelText(form.codePrefixLabel), 'psl');
    await user.click(submitButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('edits an existing experiment through the update action and reports it saved', async () => {
    vi.mocked(updateExperimentAction).mockResolvedValueOnce(true);
    const onSaved = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ExperimentForm
          projectId="project-1"
          otherPrefixes={['PSL']}
          experiment={{
            id: 'experiment-1',
            name: 'Deposition',
            codePrefix: 'ALD',
            protocol: null
          }}
          onCancel={vi.fn()}
          onSaved={onSaved}
        />
      </NextIntlClientProvider>
    );
    const user = userEvent.setup();

    expect(screen.getByLabelText(form.nameLabel)).toHaveValue('Deposition');
    await user.type(screen.getByLabelText(form.protocolLabel), 'Base method');
    await user.click(screen.getByRole('button', { name: form.saveSubmit }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(updateExperimentAction).toHaveBeenCalledWith(
      'project-1',
      'experiment-1',
      {
        name: 'Deposition',
        codePrefix: 'ALD',
        protocol: 'Base method'
      }
    );
    expect(createExperimentAction).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
