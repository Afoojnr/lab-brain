import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../../actions/create-sample', () => ({ createSampleAction: vi.fn() }));
vi.mock('../../actions/update-sample', () => ({ updateSampleAction: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { createSampleAction } from '../../actions/create-sample';
import { updateSampleAction } from '../../actions/update-sample';
import type { SampleFormValues } from '../../schemas';
import type { ParameterDefinition, Study } from '../../types';
import { SampleForm } from '.';

const form = en.samples.form;

const DEFINITIONS: ParameterDefinition[] = [
  {
    id: 'power',
    experimentId: 'experiment-1',
    name: 'Power',
    unit: 'W',
    kind: 'number',
    defaultValue: null,
    position: 0
  },
  {
    id: 'gas',
    experimentId: 'experiment-1',
    name: 'Gas',
    unit: null,
    kind: 'text',
    defaultValue: null,
    position: 1
  }
];

const STUDIES: Study[] = [
  {
    id: 'pulse',
    experimentId: 'experiment-1',
    name: 'Plasma pulse study',
    description: null,
    createdAt: new Date()
  },
  {
    id: 'teb',
    experimentId: 'experiment-1',
    name: 'TEB study',
    description: null,
    createdAt: new Date()
  }
];

const INITIAL: SampleFormValues = {
  code: 'ALD251',
  performedOn: '',
  values: { power: '100', gas: '' },
  studyIds: [],
  implementation: '',
  observation: '',
  note: ''
};

const renderForm = (props: Partial<Parameters<typeof SampleForm>[0]> = {}) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SampleForm
        projectId="project-1"
        experimentId="experiment-1"
        definitions={DEFINITIONS}
        studies={STUDIES}
        otherCodes={['ALD250', 'PSL001']}
        initial={INITIAL}
        cancelHref="/projects/project-1/experiments/experiment-1"
        {...props}
      />
    </NextIntlClientProvider>
  );

  return userEvent.setup();
};

const saveButton = () => screen.getByRole('button', { name: form.submit });

describe('SampleForm', () => {
  it('starts with the suggested code and the prefilled values', () => {
    renderForm();

    expect(screen.getByLabelText(form.codeLabel)).toHaveValue('ALD251');
    expect(screen.getByLabelText('Power (W)')).toHaveValue('100');
    expect(screen.getByLabelText('Gas')).toHaveValue('');
  });

  it('shows the error on the field holding text in a number column and does not save', async () => {
    const user = renderForm();

    await user.clear(screen.getByLabelText('Power (W)'));
    await user.type(screen.getByLabelText('Power (W)'), 'high');
    await user.click(saveButton());

    expect(await screen.findByText(form.errors.valueNotANumber)).toBeVisible();
    expect(screen.getByLabelText('Power (W)')).toBeInvalid();
    expect(screen.getByLabelText('Gas')).toBeValid();
    expect(createSampleAction).not.toHaveBeenCalled();
  });

  it('accepts a decimal comma in a number column', async () => {
    vi.mocked(createSampleAction).mockResolvedValueOnce({
      id: 'sample-9',
      code: 'ALD251'
    });
    const user = renderForm();

    await user.clear(screen.getByLabelText('Power (W)'));
    await user.type(screen.getByLabelText('Power (W)'), '1,5');
    await user.click(saveButton());

    await waitFor(() => expect(createSampleAction).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText(form.errors.valueNotANumber)
    ).not.toBeInTheDocument();
  });

  it('places the sample in several studies chosen from the dropdown', async () => {
    vi.mocked(createSampleAction).mockResolvedValueOnce({
      id: 'sample-9',
      code: 'ALD251'
    });
    const user = renderForm();

    for (const name of ['Plasma pulse study', 'TEB study']) {
      await user.click(screen.getByLabelText(form.studiesLabel));
      await user.click(await screen.findByRole('option', { name }));
      // Close the list: while it is open the rest of the form is hidden.
      await user.keyboard('{Escape}');
    }
    await user.click(saveButton());

    await waitFor(() =>
      expect(createSampleAction).toHaveBeenCalledWith(
        'project-1',
        'experiment-1',
        expect.objectContaining({ studyIds: ['pulse', 'teb'] })
      )
    );
  });

  it("starts with the sample's current studies selected", () => {
    renderForm({ initial: { ...INITIAL, studyIds: ['teb'] } });

    expect(screen.getByText('TEB study')).toBeVisible();
  });

  it('shows no studies field when the experiment has none', () => {
    renderForm({ studies: [] });

    expect(screen.queryByText(form.studiesLabel)).not.toBeInTheDocument();
  });

  it('saves one note for the whole sample', async () => {
    vi.mocked(createSampleAction).mockResolvedValueOnce({
      id: 'sample-9',
      code: 'ALD251'
    });
    const user = renderForm();

    await user.type(screen.getByLabelText(form.noteLabel), 'After service');
    await user.click(saveButton());

    await waitFor(() =>
      expect(createSampleAction).toHaveBeenCalledWith(
        'project-1',
        'experiment-1',
        expect.objectContaining({ note: 'After service' })
      )
    );
  });

  it('rejects a note over 500 characters', async () => {
    const user = renderForm();

    await user.click(screen.getByLabelText(form.noteLabel));
    await user.paste('x'.repeat(501));
    await user.click(saveButton());

    expect(await screen.findByText(form.errors.noteTooLong)).toBeVisible();
    expect(createSampleAction).not.toHaveBeenCalled();
  });

  it('rejects a code already used in the project, before calling the server', async () => {
    const user = renderForm();

    await user.clear(screen.getByLabelText(form.codeLabel));
    await user.type(screen.getByLabelText(form.codeLabel), 'psl001');
    await user.click(saveButton());

    expect(await screen.findByText(form.errors.codeDuplicate)).toBeVisible();
    expect(createSampleAction).not.toHaveBeenCalled();
  });

  it('requires a code', async () => {
    const user = renderForm();

    await user.clear(screen.getByLabelText(form.codeLabel));
    await user.click(saveButton());

    expect(await screen.findByText(form.errors.codeRequired)).toBeVisible();
  });

  it('saves the typed values, confirms with the code and opens the new sample', async () => {
    vi.mocked(createSampleAction).mockResolvedValueOnce({
      id: 'sample-9',
      code: 'ALD251'
    });
    const user = renderForm();

    await user.type(screen.getByLabelText(form.implementationLabel), 'Why');
    await user.click(saveButton());

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/projects/project-1/experiments/experiment-1/samples/sample-9'
      )
    );
    expect(createSampleAction).toHaveBeenCalledWith(
      'project-1',
      'experiment-1',
      expect.objectContaining({
        code: 'ALD251',
        values: { power: '100', gas: '' },
        implementation: 'Why'
      })
    );
    expect(toast.success).toHaveBeenCalledWith('Sample ALD251 saved');
  });

  it('edits through the update action, not the create one', async () => {
    vi.mocked(updateSampleAction).mockResolvedValueOnce({
      id: 'sample-2',
      code: 'ALD251'
    });
    const user = renderForm({ sampleId: 'sample-2' });

    await user.type(screen.getByLabelText(form.observationLabel), 'Uniform');
    await user.click(saveButton());

    await waitFor(() =>
      expect(updateSampleAction).toHaveBeenCalledWith(
        'project-1',
        'experiment-1',
        'sample-2',
        expect.objectContaining({ observation: 'Uniform' })
      )
    );
    expect(createSampleAction).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Sample ALD251 updated');
  });

  it('shows an error toast and stays put when saving fails', async () => {
    vi.mocked(createSampleAction).mockRejectedValueOnce(new Error('down'));
    const user = renderForm();

    await user.click(saveButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('shows an error toast when the server ignores the input', async () => {
    vi.mocked(createSampleAction).mockResolvedValueOnce(null);
    const user = renderForm();

    await user.click(saveButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('says so when the experiment has no columns yet, and still takes a code', () => {
    renderForm({ definitions: [], initial: { ...INITIAL, values: {} } });

    expect(screen.getByText(form.noColumns)).toBeVisible();
    expect(screen.getByLabelText(form.codeLabel)).toBeVisible();
  });
});
