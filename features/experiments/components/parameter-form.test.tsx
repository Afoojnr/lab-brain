import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/create-parameter-definition', () => ({
  createParameterDefinitionAction: vi.fn()
}));
vi.mock('../actions/update-parameter-definition', () => ({
  updateParameterDefinitionAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { createParameterDefinitionAction } from '../actions/create-parameter-definition';
import { updateParameterDefinitionAction } from '../actions/update-parameter-definition';
import { ParameterForm } from './parameter-form';

const form = en.parameters.form;

const renderForm = (
  props: Partial<Parameters<typeof ParameterForm>[0]> = {}
) => {
  const onSaved = vi.fn();

  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ParameterForm
        projectId="project-1"
        experimentId="experiment-1"
        otherNames={['Power']}
        onCancel={vi.fn()}
        onSaved={onSaved}
        {...props}
      />
    </NextIntlClientProvider>
  );

  return { user: userEvent.setup(), onSaved };
};

describe('ParameterForm', () => {
  it('adds a parameter with its unit and confirms by name', async () => {
    vi.mocked(createParameterDefinitionAction).mockResolvedValueOnce(true);
    const { user, onSaved } = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'Temperature');
    await user.type(screen.getByLabelText(form.unitLabel), '°C');
    await user.click(screen.getByRole('button', { name: form.submit }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(createParameterDefinitionAction).toHaveBeenCalledWith(
      'project-1',
      'experiment-1',
      {
        name: 'Temperature',
        unit: '°C',
        kind: 'number',
        role: 'parameter',
        defaultValue: ''
      }
    );
    expect(toast.success).toHaveBeenCalledWith('Column Temperature added');
  });

  it('rejects a name another parameter already has, before calling the server', async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'power');
    await user.click(screen.getByRole('button', { name: form.submit }));

    expect(await screen.findByText(form.errors.nameDuplicate)).toBeVisible();
    expect(createParameterDefinitionAction).not.toHaveBeenCalled();
  });

  it('requires a name', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: form.submit }));

    expect(await screen.findByText(form.errors.nameRequired)).toBeVisible();
  });

  it('edits through the update action, starting from the current values', async () => {
    vi.mocked(updateParameterDefinitionAction).mockResolvedValueOnce(true);
    // As in the real table, the parameter being edited is not among "other" names.
    const { user, onSaved } = renderForm({
      otherNames: [],
      parameter: {
        id: 'power',
        name: 'Power',
        unit: 'W',
        kind: 'number',
        role: 'parameter',
        defaultValue: null
      }
    });

    expect(screen.getByLabelText(form.nameLabel)).toHaveValue('Power');
    expect(screen.getByLabelText(form.unitLabel)).toHaveValue('W');

    await user.type(screen.getByLabelText(form.unitLabel), 'att');
    await user.click(screen.getByRole('button', { name: form.save }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(updateParameterDefinitionAction).toHaveBeenCalledWith(
      'project-1',
      'experiment-1',
      'power',
      {
        name: 'Power',
        unit: 'Watt',
        kind: 'number',
        role: 'parameter',
        defaultValue: ''
      }
    );
    expect(createParameterDefinitionAction).not.toHaveBeenCalled();
  });

  it('explains why the type cannot change once samples use the parameter', () => {
    renderForm({
      parameter: {
        id: 'power',
        name: 'Power',
        unit: 'W',
        kind: 'number',
        role: 'parameter',
        defaultValue: null
      },
      isKindLocked: true
    });

    expect(screen.getByText(form.kindLocked)).toBeVisible();
    expect(screen.getByLabelText(form.kindLabel)).toBeDisabled();
  });

  it('shows an error toast and does not report success when the server refuses', async () => {
    vi.mocked(createParameterDefinitionAction).mockResolvedValueOnce(false);
    const { user, onSaved } = renderForm();

    await user.type(screen.getByLabelText(form.nameLabel), 'Temperature');
    await user.click(screen.getByRole('button', { name: form.submit }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  describe('default values', () => {
    it('sends the typed default along with the parameter', async () => {
      vi.mocked(createParameterDefinitionAction).mockResolvedValueOnce(true);
      const { user, onSaved } = renderForm();

      await user.type(screen.getByLabelText(form.nameLabel), 'Temperature');
      await user.type(screen.getByLabelText(form.defaultLabel), '200');
      await user.click(screen.getByRole('button', { name: form.submit }));

      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
      expect(createParameterDefinitionAction).toHaveBeenCalledWith(
        'project-1',
        'experiment-1',
        {
          name: 'Temperature',
          unit: '',
          kind: 'number',
          role: 'parameter',
          defaultValue: '200'
        }
      );
    });

    it('rejects text as the default of a number parameter, on the default field', async () => {
      const { user } = renderForm();

      await user.type(screen.getByLabelText(form.nameLabel), 'Temperature');
      await user.type(screen.getByLabelText(form.defaultLabel), 'warm');
      await user.click(screen.getByRole('button', { name: form.submit }));

      expect(
        await screen.findByText(form.errors.defaultNotANumber)
      ).toBeVisible();
      expect(screen.getByLabelText(form.defaultLabel)).toBeInvalid();
      expect(createParameterDefinitionAction).not.toHaveBeenCalled();
    });

    it('starts an edit with the current default and explains what it does', () => {
      renderForm({
        otherNames: [],
        parameter: {
          id: 'power',
          name: 'Power',
          unit: 'W',
          kind: 'number',
          role: 'parameter',
          defaultValue: 100
        }
      });

      expect(screen.getByLabelText(form.defaultLabel)).toHaveValue('100');
      expect(screen.getByText(form.defaultHint)).toBeVisible();
    });

    it('starts an edit with an empty default when the parameter has none', () => {
      renderForm({
        otherNames: [],
        parameter: {
          id: 'power',
          name: 'Power',
          unit: 'W',
          kind: 'number',
          role: 'parameter',
          defaultValue: null
        }
      });

      expect(screen.getByLabelText(form.defaultLabel)).toHaveValue('');
    });
  });

  it('hides the default value for a result and saves it without one', async () => {
    vi.mocked(createParameterDefinitionAction).mockResolvedValueOnce(true);
    const { user } = renderForm();
    await user.type(screen.getByLabelText(form.nameLabel), 'Thickness');
    await user.type(screen.getByLabelText(form.defaultLabel), '40');

    await user.click(screen.getByLabelText(form.roleLabel));
    await user.click(await screen.findByRole('option', { name: 'Result' }));

    expect(screen.queryByLabelText(form.defaultLabel)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: form.submit }));

    await waitFor(() =>
      expect(createParameterDefinitionAction).toHaveBeenCalledWith(
        'project-1',
        'experiment-1',
        expect.objectContaining({ role: 'result', defaultValue: '' })
      )
    );
  });
});
