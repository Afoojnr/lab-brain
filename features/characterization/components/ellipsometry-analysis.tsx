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

import { useAnalysisRun } from '../hooks/use-analysis-run';
import type { AnalysisIds } from '../hooks/use-analysis-run';
import type { ResultColumn } from '../results';
import { ellipsometryValues } from '../techniques/ellipsometry/parse';
import type { SeqfitFile } from '../techniques/ellipsometry/parse';
import type { AnalysisSettings } from '../types';
import { EllipsometrySummaryView } from './ellipsometry-summary-view';
import { ResultsPanel } from './results-panel';

type EllipsometryAnalysisProps = {
  ids: AnalysisIds;
  files: SeqfitFile[];
  initialSettings: AnalysisSettings;
  columns: ResultColumn[];
  currentValues: Record<string, number | string>;
};

/**
 * The ellipsometry analysis of one sample: the thickness and n (each with its
 * standard deviation) read from the summary rows of an attached fit export, the
 * fitted points, and sending chosen values to the result columns after a preview.
 */
export const EllipsometryAnalysis = ({
  ids,
  files,
  initialSettings,
  columns,
  currentValues
}: EllipsometryAnalysisProps) => {
  const t = useTranslations('analysis.ellipsometry');
  const [settings, setSettings] = useState(initialSettings);
  const run = useAnalysisRun(ids, 'ellipsometry', settings);

  const readable = files.filter(file => file.summary);
  const chosen =
    readable.find(file => file.datasetId === settings.datasetId) ?? readable[0];
  const values = chosen?.summary ? ellipsometryValues(chosen.summary) : [];
  const fileItems = readable.map(file => ({
    value: file.datasetId,
    label: file.label
  }));

  if (files.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('noFile')}</p>;
  }
  if (!chosen?.summary) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {t('unreadable')}
      </p>
    );
  }
  const { summary } = chosen;

  return (
    <div className="grid min-w-0 gap-8">
      {readable.length > 1 && (
        <Field className="max-w-sm">
          <FieldLabel htmlFor="ellipsometry-file">{t('fileLabel')}</FieldLabel>
          <Select
            items={fileItems}
            value={chosen.datasetId}
            onValueChange={datasetId =>
              setSettings(current => ({ ...current, datasetId }))
            }
          >
            <SelectTrigger id="ellipsometry-file" className="w-full">
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
      <EllipsometrySummaryView summary={summary} />
      <ResultsPanel
        values={values}
        columns={columns}
        currentValues={currentValues}
        selectedIds={settings.selectedValueIds}
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
    </div>
  );
};
