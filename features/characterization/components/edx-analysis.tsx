'use client';

import { useMemo, useState } from 'react';

import { useAnalysisRun } from '../hooks/use-analysis-run';
import type { AnalysisIds } from '../hooks/use-analysis-run';
import type { ResultColumn } from '../results';
import { edxValues } from '../techniques/edx/stats';
import type { Spot } from '../techniques/edx/types';
import type { AnalysisSettings } from '../types';
import { EdxSpotsView } from './edx-spots-view';
import { ResultsPanel } from './results-panel';

type EdxAnalysisProps = {
  ids: AnalysisIds;
  spots: Spot[];
  /** Files that could not be read, shown so nothing is skipped silently. */
  problems: { file: string; reason: string }[];
  initialSettings: AnalysisSettings;
  columns: ResultColumn[];
  currentValues: Record<string, number | string>;
};

/**
 * The EDX analysis of one sample: its spots and charts, and sending chosen
 * values to the result columns after a preview.
 */
export const EdxAnalysis = ({
  ids,
  spots,
  problems,
  initialSettings,
  columns,
  currentValues
}: EdxAnalysisProps) => {
  const [settings, setSettings] = useState(initialSettings);
  const run = useAnalysisRun(ids, 'edx', settings);
  const included = useMemo(
    () => spots.filter(spot => !settings.excludedSpots.includes(spot.id)),
    [spots, settings.excludedSpots]
  );
  const values = useMemo(
    () => edxValues(included, settings.numerator, settings.denominator),
    [included, settings.numerator, settings.denominator]
  );

  // Without spots there is nothing to average or send.
  if (spots.length === 0) {
    return (
      <EdxSpotsView
        spots={spots}
        problems={problems}
        settings={settings}
        onChange={() => {}}
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-8">
      <EdxSpotsView
        spots={spots}
        problems={problems}
        settings={settings}
        onChange={next => setSettings(current => ({ ...current, ...next }))}
      />
      <section className="grid gap-3">
        <ResultsPanel
          values={values}
          columns={columns}
          currentValues={currentValues}
          selectedIds={settings.selectedValueIds}
          targets={settings.targets}
          denominator={settings.denominator}
          isBusy={run.isBusy || included.length === 0}
          onChange={next =>
            setSettings(current => ({
              ...current,
              selectedValueIds: next.selectedIds,
              targets: next.targets
            }))
          }
          onApply={run.apply}
          onSave={run.save}
        />
      </section>
    </div>
  );
};
