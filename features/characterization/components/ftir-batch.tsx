'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';

import type { FtirBatchRow } from '../batch/batch-types';
import type { ResultColumn } from '../analysis/results';
import { processSpectrum } from '../techniques/ftir/process';
import type { FtirBond, FtirSettings } from '../techniques/ftir/types';
import { ftirUnit, peakLabel } from '../techniques/ftir/values';
import type { AnalysisValue, ColumnTarget } from '../types';
import { FtirBatchSend } from './ftir-batch-send';
import { FtirWorkbench } from './ftir-workbench';

type FtirBatchProps = {
  projectId: string;
  experimentId: string;
  rows: FtirBatchRow[];
  columns: ResultColumn[];
  initialSettings: FtirSettings;
  initialSelectedIds: string[];
  initialTargets: Record<string, ColumnTarget>;
  /** Names exported files and titles the figure, e.g. the experiment. */
  exportTitle?: string;
  /** The user's bond table, to suggest what each peak may be. */
  bonds?: FtirBond[];
};

const labelOf = (row: FtirBatchRow) =>
  `${row.sampleCode}${row.measuredOn ? ` · ${row.measuredOn}` : ''}`;

/** The first few readable measurements, one per sample, so the chart is not empty to start with. */
const initialTicks = (rows: FtirBatchRow[]): string[] => {
  const seen = new Set<string>();

  return rows
    .filter(row => {
      if (!row.points || seen.has(row.sampleId)) return false;
      seen.add(row.sampleId);

      return true;
    })
    .slice(0, 4)
    .map(row => row.characterizationId);
};

/**
 * An experiment's FTIR measurements to compare: tick the samples to stack their
 * spectra, read them all the same way, detect and curate peaks once for the
 * whole stack, then send the value at chosen peaks to the result columns.
 */
export const FtirBatch = ({
  projectId,
  experimentId,
  rows,
  columns,
  initialSettings,
  initialSelectedIds,
  initialTargets,
  exportTitle,
  bonds
}: FtirBatchProps) => {
  const t = useTranslations('analysis.workspace.experiment');
  const [settings, setSettings] = useState(initialSettings);
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [targets, setTargets] = useState(initialTargets);
  const [ticked, setTicked] = useState(() => initialTicks(rows));

  const items = useMemo(
    () =>
      rows
        .filter(row => row.points && ticked.includes(row.characterizationId))
        .map(row => ({
          row,
          label: labelOf(row),
          points: row.points ?? [],
          processed: processSpectrum(row.points ?? [], settings)
        })),
    [rows, ticked, settings]
  );
  const first = items[0]?.processed;
  const definitions: AnalysisValue[] = first
    ? settings.peaks.map(peak => ({
        id: `peak:${peak.id}`,
        label: peakLabel(peak, first),
        unit: ftirUnit(first),
        value: 0
      }))
    : [];

  const tick = (row: FtirBatchRow, isChecked: boolean) =>
    setTicked(current =>
      isChecked
        ? // One measurement per sample can be applied at once.
          [
            ...current.filter(
              id =>
                rows.find(other => other.characterizationId === id)
                  ?.sampleId !== row.sampleId
            ),
            row.characterizationId
          ]
        : current.filter(id => id !== row.characterizationId)
    );

  return (
    <div className="grid min-w-0 gap-8">
      <section className="grid min-w-0 gap-2">
        <h3 className="font-medium">{t('rowsTitle')}</h3>
        <p className="text-muted-foreground text-sm">
          {t('ftirRowsDescription')}
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(row => (
            <li
              key={row.characterizationId}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                id={`ftir-row-${row.characterizationId}`}
                checked={ticked.includes(row.characterizationId)}
                disabled={!row.points}
                onCheckedChange={isChecked => tick(row, isChecked)}
              />
              <label htmlFor={`ftir-row-${row.characterizationId}`}>
                {labelOf(row)}
                {!row.points && (
                  <span className="text-muted-foreground block text-xs">
                    {t('noSpectrum')}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      </section>
      {items.length > 0 ? (
        <>
          <FtirWorkbench
            spectra={items.map(item => ({
              id: item.row.characterizationId,
              label: item.label,
              points: item.points
            }))}
            settings={settings}
            onChange={setSettings}
            title={exportTitle}
            bonds={bonds}
          />
          <FtirBatchSend
            projectId={projectId}
            experimentId={experimentId}
            items={items}
            settings={settings}
            definitions={definitions}
            columns={columns}
            selectedIds={selectedIds}
            targets={targets}
            onChange={next => {
              setSelectedIds(next.selectedIds);
              setTargets(next.targets);
            }}
          />
        </>
      ) : (
        <p className="text-muted-foreground text-sm">{t('pickSamples')}</p>
      )}
    </div>
  );
};
