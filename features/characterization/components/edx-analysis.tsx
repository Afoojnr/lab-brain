'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { useAnalysisRun } from '../hooks/use-analysis-run';
import type { AnalysisIds } from '../hooks/use-analysis-run';
import { formatValue } from '../results';
import type { ResultColumn } from '../results';
import { elementColor, spotColor } from '../techniques/edx/colors';
import {
  DEFAULT_ELEMENTS,
  edxValues,
  summarizeSpots
} from '../techniques/edx/stats';
import type { Spot } from '../techniques/edx/types';
import type { AnalysisSettings } from '../types';
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

/** Every second channel is enough for a line on screen. */
const downsample = <T,>(items: T[]): T[] =>
  items.filter((_item, index) => index % 2 === 0);

/**
 * The EDX analysis of one sample: its spots (untick bad ones, the files are
 * untouched), the composition averaged over the rest with error bars, the
 * spectra, a ratio of two chosen elements, and sending chosen values to the
 * result columns after a preview.
 */
export const EdxAnalysis = ({
  ids,
  spots,
  problems,
  initialSettings,
  columns,
  currentValues
}: EdxAnalysisProps) => {
  const t = useTranslations('analysis.edx');
  const [settings, setSettings] = useState(initialSettings);
  const run = useAnalysisRun(ids, 'edx', settings);

  const included = useMemo(
    () => spots.filter(spot => !settings.excludedSpots.includes(spot.id)),
    [spots, settings.excludedSpots]
  );
  const stats = useMemo(() => summarizeSpots(included), [included]);
  const values = useMemo(
    () => edxValues(included, settings.numerator, settings.denominator),
    [included, settings.numerator, settings.denominator]
  );
  const elements = useMemo(
    () =>
      [
        ...new Set([
          ...DEFAULT_ELEMENTS,
          ...spots.flatMap(spot => Object.keys(spot.atomic)),
          settings.numerator,
          settings.denominator
        ])
      ].sort(),
    [spots, settings.numerator, settings.denominator]
  );
  const spotElements = useMemo(
    () => [...new Set(spots.flatMap(spot => Object.keys(spot.atomic)))].sort(),
    [spots]
  );
  const composition = Object.entries(stats).map(([element, stat]) => ({
    element,
    mean: stat.mean,
    std: stat.std
  }));
  const spectra = included.filter(spot => spot.spectrum);
  const elementItems = elements.map(element => ({
    value: element,
    label: element
  }));

  const toggleSpot = (id: string, isIncluded: boolean) =>
    setSettings(current => ({
      ...current,
      excludedSpots: isIncluded
        ? current.excludedSpots.filter(other => other !== id)
        : [...current.excludedSpots, id]
    }));

  if (spots.length === 0) {
    return (
      <div className="grid gap-3">
        <p className="text-muted-foreground text-sm">{t('noSpots')}</p>
        <ProblemList problems={problems} />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-8">
      <ProblemList problems={problems} />
      <section className="grid gap-3">
        <h3 className="font-medium">{t('ratioTitle')}</h3>
        <div className="flex flex-wrap gap-4">
          {(['numerator', 'denominator'] as const).map(side => (
            <Field key={side} className="w-40">
              <FieldLabel htmlFor={`edx-${side}`}>{t(side)}</FieldLabel>
              <Select
                items={elementItems}
                value={settings[side]}
                onValueChange={element => {
                  if (element)
                    setSettings(current => ({ ...current, [side]: element }));
                }}
              >
                <SelectTrigger id={`edx-${side}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {elementItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ))}
        </div>
      </section>
      <section className="grid min-w-0 gap-3">
        <h3 className="font-medium">{t('spotsTitle')}</h3>
        <p className="text-muted-foreground text-sm">{t('spotsDescription')}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t('spot')}</TableHead>
              {spotElements.map(element => (
                <TableHead key={element}>{element}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {spots.map(spot => {
              const isIncluded = !settings.excludedSpots.includes(spot.id);

              return (
                <TableRow
                  key={spot.id}
                  data-included={isIncluded}
                  className="data-[included=false]:opacity-50"
                >
                  <TableCell>
                    <Checkbox
                      aria-label={t('include', { name: spot.label })}
                      checked={isIncluded}
                      onCheckedChange={isChecked =>
                        toggleSpot(spot.id, isChecked)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{spot.label}</TableCell>
                  {spotElements.map(element => (
                    <TableCell key={element} className="tabular-nums">
                      {spot.atomic[element] === undefined
                        ? '—'
                        : formatValue(spot.atomic[element] * 100)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="text-muted-foreground text-xs">
          {t('included', { included: included.length, total: spots.length })}
        </p>
        {included.length === 0 && (
          <p role="alert" className="text-destructive text-sm">
            {t('allExcluded')}
          </p>
        )}
      </section>
      {composition.length > 0 && (
        <section className="grid gap-3">
          <h3 className="font-medium">{t('compositionTitle')}</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={composition}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="element" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={value =>
                    typeof value === 'number'
                      ? formatValue(value)
                      : String(value ?? '')
                  }
                />
                <Bar dataKey="mean" name={t('mean')} isAnimationActive={false}>
                  {composition.map(item => (
                    <Cell
                      key={item.element}
                      fill={elementColor(item.element)}
                      fillOpacity={0.7}
                    />
                  ))}
                  <ErrorBar dataKey="std" width={6} stroke="currentColor" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
      <section className="grid gap-3">
        <h3 className="font-medium">{t('spectraTitle')}</h3>
        {spectra.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noSpectra')}</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="energyKev"
                  domain={[0, 10]}
                  allowDataOverflow
                  label={{
                    value: t('spectraAxisX'),
                    position: 'insideBottom',
                    offset: -4
                  }}
                />
                <YAxis
                  label={{
                    value: t('spectraAxisY'),
                    angle: -90,
                    position: 'insideLeft'
                  }}
                />
                <Tooltip />
                <Legend />
                {spectra.map((spot, index) => (
                  <Line
                    key={spot.id}
                    name={spot.label}
                    data={downsample(
                      (spot.spectrum?.energyKev ?? []).map(
                        (energyKev, channel) => ({
                          energyKev,
                          counts: spot.spectrum?.counts[channel] ?? 0
                        })
                      )
                    )}
                    dataKey="counts"
                    dot={false}
                    stroke={spotColor(index)}
                    strokeWidth={1}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
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

const ProblemList = ({
  problems
}: {
  problems: { file: string; reason: string }[];
}) => {
  const t = useTranslations('analysis.edx');
  if (problems.length === 0) return null;

  return (
    <div role="alert" className="text-destructive grid gap-1 text-sm">
      <p>{t('problems')}</p>
      <ul className="list-disc pl-5">
        {problems.map(problem => (
          <li key={problem.file}>
            {problem.file}:{' '}
            {t(
              `reasons.${
                problem.reason === 'missingColumns' ||
                problem.reason === 'invalidNumber' ||
                problem.reason === 'empty'
                  ? problem.reason
                  : 'unreadable'
              }`
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
