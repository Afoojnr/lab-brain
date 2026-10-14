'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import type { FtirFile } from '../analysis/load';
import type { ResultColumn } from '../analysis/results';
import { useAnalysisRun } from '../hooks/use-analysis-run';
import type { AnalysisIds } from '../hooks/use-analysis-run';
import { defaultFtirSettings } from '../techniques/ftir/defaults';
import { processSpectrum } from '../techniques/ftir/process';
import { ftirValues } from '../techniques/ftir/values';
import type { FtirBond } from '../techniques/ftir/types';
import type { AnalysisSettings } from '../types';
import { FtirWorkbench } from './ftir-workbench';
import { ResultsPanel } from './results-panel';

type FtirAnalysisProps = {
  ids: AnalysisIds;
  files: FtirFile[];
  initialSettings: AnalysisSettings;
  columns: ResultColumn[];
  currentValues: Record<string, number | string>;
  /** Names exported files and titles the figure, e.g. the sample and technique. */
  exportTitle?: string;
  /** The user's bond table, to suggest what each peak may be. */
  bonds?: FtirBond[];
};

/**
 * The FTIR analysis of one sample: its spectra (every attached file is one,
 * stacked to compare), how they are read and processed, the peaks, and sending
 * the value at chosen peaks to the sample's result columns after a preview.
 */
export const FtirAnalysis = ({
  ids,
  files,
  initialSettings,
  columns,
  currentValues,
  exportTitle,
  bonds
}: FtirAnalysisProps) => {
  const t = useTranslations('analysis.ftir');
  const [settings, setSettings] = useState(initialSettings);
  const ftir = settings.ftir ?? defaultFtirSettings();
  const readable = files.filter(
    (file): file is FtirFile & { points: NonNullable<FtirFile['points']> } =>
      file.points !== null
  );
  const source =
    readable.find(file => file.datasetId === settings.datasetId) ?? readable[0];
  const values = source
    ? ftirValues(processSpectrum(source.points, ftir), ftir)
    : [];
  // A removed peak's value must not stay ticked: the server would refuse it.
  const available = settings.selectedValueIds.filter(id =>
    values.some(value => value.id === id)
  );
  const run = useAnalysisRun(ids, 'ftir', {
    ...settings,
    ftir,
    selectedValueIds: available
  });
  const fileItems = readable.map(file => ({
    value: file.datasetId,
    label: file.label
  }));

  if (files.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('noFile')}</p>;
  }

  return (
    <div className="grid min-w-0 gap-8">
      {files.some(file => !file.points) && (
        <div className="grid gap-1 text-sm" role="alert">
          <p className="text-destructive">{t('unreadableTitle')}</p>
          <ul className="list-disc pl-5">
            {files
              .filter(file => !file.points)
              .map(file => (
                <li key={file.datasetId}>
                  {file.label}:{' '}
                  {t(`reasons.${file.reason ?? 'empty'}`, {
                    line: file.line ?? 0
                  })}
                </li>
              ))}
          </ul>
        </div>
      )}
      {source && (
        <>
          <FtirWorkbench
            spectra={readable.map(file => ({
              id: file.datasetId,
              label: file.label,
              points: file.points
            }))}
            settings={ftir}
            title={exportTitle}
            bonds={bonds}
            onChange={next =>
              setSettings(current => ({ ...current, ftir: next }))
            }
          />
          {readable.length > 1 && (
            <Field className="max-w-sm">
              <FieldLabel htmlFor="ftir-source">{t('valuesFrom')}</FieldLabel>
              <Select
                items={fileItems}
                value={source.datasetId}
                onValueChange={datasetId =>
                  setSettings(current => ({ ...current, datasetId }))
                }
              >
                <SelectTrigger id="ftir-source" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fileItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <ResultsPanel
            values={values}
            columns={columns}
            currentValues={currentValues}
            selectedIds={available}
            targets={settings.targets}
            denominator=""
            isBusy={run.isBusy}
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
        </>
      )}
    </div>
  );
};
