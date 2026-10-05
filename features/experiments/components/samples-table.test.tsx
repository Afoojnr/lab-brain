import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/assign-study', () => ({
  assignStudyAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { assignStudyAction } from '../actions/assign-study';
import type { Study, Sample } from '../types';
import { SamplesTable } from './samples-table';

const sample = (code: string, studyIds: string[] = []): Sample => ({
  id: `id-${code}`,
  experimentId: 'experiment-1',
  code,
  performedOn: null,
  values: {},
  note: null,
  implementation: null,
  observation: null,
  derivedFromId: null,
  studyIds,
  createdAt: new Date()
});
const PULSE: Study = {
  id: 'pulse',
  experimentId: 'experiment-1',
  name: 'Plasma pulse study',
  description: null,
  createdAt: new Date()
};
const SAMPLES = [sample('ALD001', ['pulse']), sample('ALD002')];

const renderTable = (
  props: { samples?: Sample[]; isFiltered?: boolean } = {}
) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SamplesTable
        projectId="project-1"
        experimentId="experiment-1"
        definitions={[]}
        samples={props.samples ?? SAMPLES}
        studies={[PULSE]}
        isFiltered={props.isFiltered ?? false}
      />
    </NextIntlClientProvider>
  );

  return userEvent.setup();
};

const assign = en.studies.assign;

describe('SamplesTable', () => {
  it("shows each sample's studies as badges", () => {
    renderTable();

    const row = screen.getByRole('row', { name: /ALD001/ });
    expect(within(row).getByText('Plasma pulse study')).toBeVisible();
  });

  it('marks a sample that has a note, and exposes the note text', () => {
    renderTable({
      samples: [{ ...sample('ALD001'), note: 'Pulse changed after service' }]
    });

    expect(
      screen.getByText('Note: Pulse changed after service')
    ).toBeInTheDocument();
  });

  it('says when a filter hides every sample, instead of claiming there are none', () => {
    renderTable({ samples: [], isFiltered: true });

    expect(screen.getByText(en.samples.list.noMatch)).toBeVisible();
    expect(screen.queryByText(en.samples.list.empty)).toBeNull();
  });

  it('offers to assign only once rows are selected, then tags exactly those samples', async () => {
    vi.mocked(assignStudyAction).mockResolvedValueOnce(1);
    const user = renderTable();
    expect(screen.queryByRole('group')).toBeNull();

    await user.click(screen.getByRole('checkbox', { name: 'Select ALD002' }));
    await user.click(
      screen.getByRole('button', { name: 'Assign to Plasma pulse study' })
    );

    expect(assignStudyAction).toHaveBeenCalledWith(
      'project-1',
      'experiment-1',
      'pulse',
      ['id-ALD002']
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        '1 sample assigned to Plasma pulse study'
      )
    );
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('selects every sample from the header checkbox', async () => {
    const user = renderTable();

    await user.click(screen.getByRole('checkbox', { name: assign.selectAll }));

    expect(screen.getByText('2 samples selected')).toBeVisible();
  });

  it('keeps the selection and shows an error toast when assigning fails', async () => {
    vi.mocked(assignStudyAction).mockRejectedValueOnce(new Error('down'));
    const user = renderTable();

    await user.click(screen.getByRole('checkbox', { name: 'Select ALD002' }));
    await user.click(
      screen.getByRole('button', { name: 'Assign to Plasma pulse study' })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(en.errors.unexpected)
    );
    expect(screen.getByText('1 sample selected')).toBeVisible();
  });
});
