import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/create-derived-column', () => ({
  createDerivedColumnAction: vi.fn()
}));
vi.mock('../actions/update-derived-column', () => ({
  updateDerivedColumnAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { createDerivedColumnAction } from '../actions/create-derived-column';
import type { ParameterDefinition, Sample } from '../types';
import { DerivedColumnForm } from './derived-column-form';

const t = en.derived.form;

const column = (
  id: string,
  name: string,
  kind: 'number' | 'text'
): ParameterDefinition => ({
  id,
  experimentId: 'experiment-1',
  name,
  unit: null,
  kind,
  role: 'parameter',
  defaultValue: null,
  position: 0
});
const COLUMNS = [
  column('thickness', 'Thickness', 'number'),
  column('cycles', 'Cycles', 'number'),
  column('substrate', 'Substrate', 'text')
];
const SAMPLES: Pick<Sample, 'id' | 'code' | 'values'>[] = [
  { id: 's1', code: 'ALD001', values: { thickness: 40.5, cycles: 50 } },
  { id: 's2', code: 'ALD002', values: { thickness: 43.2 } }
];

const renderForm = () => {
  const onSaved = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DerivedColumnForm
        projectId="project-1"
        experimentId="experiment-1"
        columns={COLUMNS}
        otherNames={['Thickness', 'Cycles', 'Substrate']}
        previewSamples={SAMPLES}
        onCancel={vi.fn()}
        onSaved={onSaved}
      />
    </NextIntlClientProvider>
  );

  return { user: userEvent.setup(), onSaved };
};

describe('DerivedColumnForm', () => {
  it('previews the result on the first samples, and says "not recorded" when an input is missing', async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText(t.unitLabel), 'Å/cycle');
    await user.click(screen.getByLabelText(t.formulaLabel));
    await user.paste('[Thickness] * 10 / [Cycles]');

    expect(
      await screen.findByText('8.1 Å/cycle', { exact: false })
    ).toBeVisible();
    expect(screen.getByText(t.previewEmpty)).toBeVisible();
  });

  it('inserts a column at the cursor from its button', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Thickness' }));

    expect(screen.getByLabelText(t.formulaLabel)).toHaveValue('[Thickness]');
  });

  it('offers only number columns to insert', () => {
    renderForm();

    expect(screen.queryByRole('button', { name: 'Substrate' })).toBeNull();
  });

  it('names the column it cannot find, and the one that is not a number', async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText(t.nameLabel), 'GPC');

    await user.click(screen.getByLabelText(t.formulaLabel));
    await user.paste('[Nope] * 2');
    await user.click(screen.getByRole('button', { name: t.submit }));
    expect(
      await screen.findByText('There is no column called Nope.')
    ).toBeVisible();

    await user.clear(screen.getByLabelText(t.formulaLabel));
    await user.click(screen.getByLabelText(t.formulaLabel));
    await user.paste('[Substrate] * 2');
    await user.click(screen.getByRole('button', { name: t.submit }));
    expect(
      await screen.findByText(
        'Substrate is not a number column, so it cannot be used.'
      )
    ).toBeVisible();
    expect(createDerivedColumnAction).not.toHaveBeenCalled();
  });

  it('refuses a name that is already a column', async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText(t.nameLabel), 'cycles');
    await user.click(screen.getByLabelText(t.formulaLabel));
    await user.paste('1 + 1');
    await user.click(screen.getByRole('button', { name: t.submit }));

    expect(await screen.findByText(t.errors.nameDuplicate)).toBeVisible();
  });

  it('sends what was typed and closes on success', async () => {
    vi.mocked(createDerivedColumnAction).mockResolvedValueOnce(true);
    const { user, onSaved } = renderForm();

    await user.type(screen.getByLabelText(t.nameLabel), 'GPC');
    await user.type(screen.getByLabelText(t.unitLabel), 'Å/cycle');
    await user.click(screen.getByLabelText(t.formulaLabel));
    await user.paste('[Thickness] * 10 / [Cycles]');
    await user.click(screen.getByRole('button', { name: t.submit }));

    await waitFor(() =>
      expect(createDerivedColumnAction).toHaveBeenCalledWith(
        'project-1',
        'experiment-1',
        {
          name: 'GPC',
          unit: 'Å/cycle',
          formula: '[Thickness] * 10 / [Cycles]'
        }
      )
    );
    expect(onSaved).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Calculated column GPC added');
  });

  it('shows an error toast and stays open when the server refuses', async () => {
    vi.mocked(createDerivedColumnAction).mockResolvedValueOnce(false);
    const { user, onSaved } = renderForm();

    await user.type(screen.getByLabelText(t.nameLabel), 'GPC');
    await user.click(screen.getByLabelText(t.formulaLabel));
    await user.paste('1 + 1');
    await user.click(screen.getByRole('button', { name: t.submit }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
