'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { formatValue } from '../results';
import { elementColor, spotColor } from '../techniques/edx/colors';
import { DEFAULT_ELEMENTS, summarizeSpots } from '../techniques/edx/stats';
import type { Spot } from '../techniques/edx/types';
import { EdxRatioSelects } from './edx-ratio-selects';

export type EdxViewSettings = {
  numerator: string;
  denominator: string;
  /** Spots left out of the averages (their files are untouched). */
  excludedSpots: string[];
};

type EdxSpotsViewProps = {
  spots: Spot[];
  /** Files that could not be read, shown so nothing is skipped silently. */
  problems?: { file: string; reason: string }[];
  settings: EdxViewSettings;
  /** Hides the ratio selects when the ratio is set once for several items. */
  isRatioFixed?: boolean;
  onChange: (settings: EdxViewSettings) => void;
};

/** Every second channel is enough for a line on screen. */
const downsample = <T,>(items: T[]): T[] =>
  items.filter((_item, index) => index % 2 === 0);

/**
 * One EDX measurement set as the lab notebook shows it: a ratio of two chosen
 * elements, the spots (untick bad ones; files are untouched), the composition
 * averaged over the rest with error bars, and the spectra. Controlled: the
 * caller keeps the settings, so the sample page, the upload workspace and the
 * experiment workspace share it.
 */
export const EdxSpotsView = ({
  spots,
  problems = [],
  settings,
  isRatioFixed = false,
  onChange
}: EdxSpotsViewProps) => {
  const t = useTranslations('analysis.edx');

  const included = useMemo(
    () => spots.filter(spot => !settings.excludedSpots.includes(spot.id)),
    [spots, settings.excludedSpots]
  );
  const stats = useMemo(() => summarizeSpots(included), [included]);
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

  const toggleSpot = (id: string, isIncluded: boolean) =>
    onChange({
      ...settings,
      excludedSpots: isIncluded
        ? settings.excludedSpots.filter(other => other !== id)
        : [...settings.excludedSpots, id]
    });

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
      {!isRatioFixed && (
        <EdxRatioSelects
          elements={elements}
          numerator={settings.numerator}
          denominator={settings.denominator}
          onChange={(numerator, denominator) =>
            onChange({ ...settings, numerator, denominator })
          }
        />
      )}
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
