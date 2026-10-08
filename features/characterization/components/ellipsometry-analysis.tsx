'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

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
import { formatValue } from '../results';
import type { ResultColumn } from '../results';
import { ellipsometryValues } from '../techniques/ellipsometry/parse';
import type { SeqfitFile } from '../techniques/ellipsometry/parse';
import type { AnalysisSettings } from '../types';
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
      <section className="grid gap-2">
        <h3 className="font-medium">{t('summaryTitle')}</h3>
        <dl className="grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t('thickness')}</dt>
          <dd className="tabular-nums">
            {formatValue(summary.thickness.mean)} ±{' '}
            {formatValue(summary.thickness.std)} nm
          </dd>
          <dt className="text-muted-foreground">{t('n')}</dt>
          <dd className="tabular-nums">
            {formatValue(summary.n.mean)} ± {formatValue(summary.n.std)}
          </dd>
        </dl>
        <p className="text-muted-foreground text-xs">{t('notice')}</p>
      </section>
      {summary.points.length > 0 && (
        <section className="grid gap-3">
          <h3 className="font-medium">{t('pointsTitle')}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.points}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={value =>
                    typeof value === 'number'
                      ? formatValue(value)
                      : String(value ?? '')
                  }
                />
                <Bar
                  dataKey="thickness"
                  name={t('thickness')}
                  fill="#2563eb"
                  fillOpacity={0.7}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
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
