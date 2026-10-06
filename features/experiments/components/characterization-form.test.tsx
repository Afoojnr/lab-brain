import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/create-characterization', () => ({
  createCharacterizationAction: vi.fn()
}));
vi.mock('../actions/update-characterization', () => ({
  updateCharacterizationAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { createCharacterizationAction } from '../actions/create-characterization';
import { updateCharacterizationAction } from '../actions/update-characterization';
import { CharacterizationForm } from './characterization-form';

const form = en.characterizations.form;

const renderForm = (
  props: Partial<Parameters<typeof CharacterizationForm>[0]> = {}
) => {
  const onSaved = vi.fn();

  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CharacterizationForm
        projectId="project-1"
        experimentId="experiment-1"
        sampleId="sample-1"
        knownTechniques={['SEM', 'EDX']}
        onCancel={vi.fn()}
        onSaved={onSaved}
        {...props}
      />
    </NextIntlClientProvider>
  );

  return { user: userEvent.setup(), onSaved };
};

describe('CharacterizationForm', () => {
  it('fills the technique from a name already used in the project', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Use EDX' }));

    expect(screen.getByLabelText(form.techniqueLabel)).toHaveValue('EDX');
  });

  it('offers no shortcuts when the project has no techniques yet', () => {
    renderForm({ knownTechniques: [] });

    expect(
      screen.queryByRole('group', { name: form.knownTechniques })
    ).toBeNull();
  });

  it('requires a technique and does not submit without one', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: form.submit }));

    expect(
      await screen.findByText(form.errors.techniqueRequired)
    ).toBeVisible();
    expect(createCharacterizationAction).not.toHaveBeenCalled();
  });

  it('adds the record, confirms by technique and reports it saved', async () => {
    vi.mocked(createCharacterizationAction).mockResolvedValueOnce(true);
    const { user, onSaved } = renderForm();

    await user.type(screen.getByLabelText(form.techniqueLabel), 'AFM');
    await user.click(screen.getByRole('button', { name: form.submit }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(createCharacterizationAction).toHaveBeenCalledWith(
      'project-1',
      'experiment-1',
      'sample-1',
      { technique: 'AFM', measuredOn: '', note: '' }
    );
    expect(toast.success).toHaveBeenCalledWith('Characterization AFM added');
  });

  it('edits through the update action, starting from the current values', async () => {
    vi.mocked(updateCharacterizationAction).mockResolvedValueOnce(true);
    const { user, onSaved } = renderForm({
      characterization: {
        id: 'record-1',
        technique: 'SEM',
        measuredOn: '2026-09-15',
        note: null
      }
    });

    expect(screen.getByLabelText(form.techniqueLabel)).toHaveValue('SEM');
    expect(screen.getByLabelText(form.dateLabel)).toHaveValue('2026-09-15');
    await user.type(screen.getByLabelText(form.noteLabel), 'Top view');
    await user.click(screen.getByRole('button', { name: form.save }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(updateCharacterizationAction).toHaveBeenCalledWith(
      'project-1',
      'experiment-1',
      'sample-1',
      'record-1',
      { technique: 'SEM', measuredOn: '2026-09-15', note: 'Top view' }
    );
    expect(createCharacterizationAction).not.toHaveBeenCalled();
  });

  it('shows an error toast and stays open when saving fails', async () => {
    vi.mocked(createCharacterizationAction).mockResolvedValueOnce(false);
    const { user, onSaved } = renderForm();

    await user.type(screen.getByLabelText(form.techniqueLabel), 'AFM');
    await user.click(screen.getByRole('button', { name: form.submit }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
