import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    Bar: Passthrough,
    BarChart: Passthrough,
    CartesianGrid: Passthrough,
    Cell: Passthrough,
    ErrorBar: Passthrough,
    Legend: Passthrough,
    Line: Passthrough,
    LineChart: Passthrough,
    ResponsiveContainer: Passthrough,
    Tooltip: Passthrough,
    XAxis: Passthrough,
    YAxis: Passthrough
  };
});
vi.mock('../actions/apply-analysis-batch', () => ({
  applyAnalysisBatchAction: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';

import { applyAnalysisBatchAction } from '../actions/apply-analysis-batch';
import type { BatchRow } from '../batch-types';
import { ExperimentBatch } from './experiment-batch';

const t = en.analysis.workspace.experiment;

const spot = (id: string, b: number) => ({
  id,
  label: id,
  atomic: { B: b, N: 0.3 },
  spectrum: null
});
const row = (
  id: string,
  sampleId: string,
  code: string,
  measuredOn: string | null,
  currentValues: Record<string, number> = {},
  spots = [spot('s1', 0.5), spot('s2', 0.6)]
): BatchRow => ({
  characterizationId: id,
  sampleId,
  sampleCode: code,
  measuredOn,
  technique: 'EDX',
  currentValues,
  edx: { spots, problems: [], excludedSpots: [] },
  ellipsometry: null
});

// B/N of the first two spots: 55 / 30.
const ROWS = [
  row('c1', 's1', 'ALD001', '2026-09-18'),
  row('c2', 's2', 'ALD002', null, { ratio: 9 }),
  // A repeat of the first sample's measurement.
  row('c3', 's1', 'ALD001', '2026-09-25', {}, [spot('x', 0.4)]),
  row('c4', 's4', 'ALD004', null, {}, [])
];

const renderBatch = () => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ExperimentBatch
        projectId="p1"
        experimentId="e1"
        kind="edx"
        rows={ROWS}
        columns={[{ id: 'ratio', name: 'B/N', unit: null }]}
        initialSelectedIds={['ratio']}
        initialTargets={{}}
      />
    </NextIntlClientProvider>
  );
  return userEvent.setup();
};

beforeEach(() => vi.clearAllMocks());

describe('ExperimentBatch', () => {
  it('shows, for a ticked sample, the value it would put in the chosen column', async () => {
    const user = renderBatch();

    await user.click(
      screen.getByRole('checkbox', { name: 'Select ALD001 · 2026-09-18' })
    );

    const [first] = screen.getAllByRole('row', { name: /ALD001 · 2026-09-18/ });
    expect(within(first as HTMLElement).getByText('1.83333')).toBeVisible(); // 55 / 30
  });

  it('starts a sample that would replace a different value as skipped, and says what it replaces', async () => {
    const user = renderBatch();

    await user.click(screen.getByRole('checkbox', { name: 'Select ALD002' }));

    expect(
      screen.getByRole('checkbox', { name: 'Update ALD002' })
    ).not.toBeChecked();
    expect(screen.getByText('9 → 1.83333')).toBeVisible();
  });

  it('starts a sample that fills an empty cell as updated', async () => {
    const user = renderBatch();

    await user.click(
      screen.getByRole('checkbox', { name: 'Select ALD001 · 2026-09-18' })
    );

    expect(
      screen.getByRole('checkbox', { name: 'Update ALD001 · 2026-09-18' })
    ).toBeChecked();
  });

  it('applies only the samples set to update, with their own left-out spots', async () => {
    vi.mocked(applyAnalysisBatchAction).mockResolvedValue(1);
    const user = renderBatch();
    await user.click(
      screen.getByRole('checkbox', { name: 'Select ALD001 · 2026-09-18' })
    );
    await user.click(screen.getByRole('checkbox', { name: 'Select ALD002' }));
    await user.click(
      screen.getByRole('button', {
        name: 'Show the details of ALD001 · 2026-09-18'
      })
    );
    await user.click(screen.getByRole('checkbox', { name: 'Include s2' }));

    await user.click(screen.getByRole('button', { name: 'Apply to 1 sample' }));

    await waitFor(() =>
      expect(applyAnalysisBatchAction).toHaveBeenCalledTimes(1)
    );
    expect(
      vi.mocked(applyAnalysisBatchAction).mock.calls[0]?.[3]
    ).toMatchObject({
      settings: {
        numerator: 'B',
        denominator: 'N',
        selectedValueIds: ['ratio'],
        targets: { ratio: { type: 'column', columnId: 'ratio' } }
      },
      rows: [{ characterizationId: 'c1', excludedSpots: ['s2'] }]
    });
    expect(toast.success).toHaveBeenCalledWith('1 sample updated');
  });

  it('lets the user choose to update a sample that would replace a value', async () => {
    vi.mocked(applyAnalysisBatchAction).mockResolvedValue(1);
    const user = renderBatch();
    await user.click(screen.getByRole('checkbox', { name: 'Select ALD002' }));

    await user.click(screen.getByRole('checkbox', { name: 'Update ALD002' }));
    await user.click(screen.getByRole('button', { name: 'Apply to 1 sample' }));

    await waitFor(() => expect(applyAnalysisBatchAction).toHaveBeenCalled());
    expect(
      vi.mocked(applyAnalysisBatchAction).mock.calls[0]?.[3]
    ).toMatchObject({
      rows: [{ characterizationId: 'c2' }]
    });
  });

  it('ticks only one measurement per sample: the repeat replaces the first', async () => {
    const user = renderBatch();
    const first = screen.getByRole('checkbox', {
      name: 'Select ALD001 · 2026-09-18'
    });
    const repeat = screen.getByRole('checkbox', {
      name: 'Select ALD001 · 2026-09-25'
    });

    await user.click(first);
    await user.click(repeat);

    expect(first).not.toBeChecked();
    expect(repeat).toBeChecked();
  });

  it('cannot tick a sample with nothing to compute from', () => {
    renderBatch();

    expect(
      screen.getByRole('checkbox', { name: 'Select ALD004' })
    ).toHaveAttribute('data-disabled');
  });

  it('cannot apply with nothing ticked, or with every value unticked', async () => {
    const user = renderBatch();
    expect(
      screen.getByRole('button', { name: 'Apply to 0 samples' })
    ).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', { name: 'Select ALD001 · 2026-09-18' })
    );
    await user.click(screen.getByRole('checkbox', { name: 'B/N' }));

    expect(screen.getByRole('button', { name: /Apply to/ })).toBeDisabled();
    expect(screen.getByText(en.analysis.results.noneSelected)).toBeVisible();
  });

  it('shows an error and keeps the ticks when the server refuses', async () => {
    vi.mocked(applyAnalysisBatchAction).mockResolvedValue(null);
    const user = renderBatch();
    await user.click(
      screen.getByRole('checkbox', { name: 'Select ALD001 · 2026-09-18' })
    );

    await user.click(screen.getByRole('button', { name: 'Apply to 1 sample' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(t.failed));
    expect(
      screen.getByRole('checkbox', { name: 'Select ALD001 · 2026-09-18' })
    ).toBeChecked();
  });
});
