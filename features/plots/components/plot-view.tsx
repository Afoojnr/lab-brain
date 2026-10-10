'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { columnLabel } from '../column-label';
import { defaultSettings } from '../default-settings';
import type { ExportTable } from '@/lib/export/types';

import { applyFilters, describeFilters } from '../filters';
import { captionLines } from '../export-caption';
import { exportPlot } from '../export-plot';
import type { ExportFormat } from '../export-plot';
import type { PlotTable } from '../from-table';
import { buildSeries, foldSeries } from '../plot-model';
import { seriesLabel, seriesStyle } from '../series-style';
import { DEFAULT_STYLE, TEXT_SIZES } from '../style';
import type { PlotStyle } from '../style';
import type {
  PlotFilter,
  PlotPoint,
  PlotSettings,
  SavedPlotInput
} from '../types';
import { ExportMenu } from './export-menu';
import { PlotControls } from './plot-controls';
import { PlotFilters } from './plot-filters';
import { PlotStylePanel } from './plot-style-panel';
import { SavePlotDialog } from './save-plot-dialog';
import { ScatterPlot } from './scatter-plot';

/** How many groups get their own colour; the validated palette tells this many apart on a scatter plot. */
const MAX_GROUPS = 3;

type PlotViewProps = {
  table: PlotTable;
  /** Whether the rows carry studies to colour by (an experiment's samples). */
  canGroupByStudy: boolean;
  /** Shown when the table has fewer than two columns of numbers. */
  notEnoughNumbers: string;
  /** Where the data is from (project and experiment, or the file), written on exported figures. */
  sourceLabel?: string;
  /** What to start from, when opening a saved plot. */
  initial?: Omit<SavedPlotInput, 'name'>;
  /** Present for an experiment's plot, which can be saved; an uploaded table cannot. */
  save?: {
    projectId: string;
    experimentId: string;
    /** The saved plot that is open: Save changes replaces it. */
    open?: { id: string; name: string };
    /** Titles of the experiment's other saved plots, for the duplicate check. */
    otherNames: string[];
  };
};

/**
 * Controls, filters, chart, the list of points to tick, and the counts of what
 * was plotted and left out for one table. Start with a new `key` when the table
 * changes, so the settings never point at a column that is gone.
 */
export const PlotView = ({
  table,
  canGroupByStudy,
  notEnoughNumbers,
  sourceLabel,
  initial,
  save
}: PlotViewProps) => {
  const t = useTranslations('plots.chart');
  const tSelection = useTranslations('plots.selection');
  const tFilters = useTranslations('plots.filters');
  const tExport = useTranslations('plots.export');
  const tControls = useTranslations('plots.controls');
  const tSave = useTranslations('plots.save');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, startExport] = useTransition();
  const [settings, setSettings] = useState<PlotSettings | null>(
    () => initial?.settings ?? defaultSettings(table.columns)
  );
  const [style, setStyle] = useState<PlotStyle>(
    initial?.style ?? DEFAULT_STYLE
  );
  const [filters, setFilters] = useState<PlotFilter[]>(initial?.filters ?? []);
  // Unticked samples by row id. They stay in the list so they can be ticked again.
  const [unticked, setUntickedIds] = useState<string[]>(
    initial?.untickedIds ?? []
  );

  const built = useMemo(() => {
    if (!settings) return null;
    const filtered = applyFilters(table.rows, filters);
    // Every sample that could be plotted, ticked or not: the list to choose from.
    const candidates = buildSeries(filtered.rows, settings);
    const chosen = buildSeries(
      filtered.rows.filter(row => !unticked.includes(row.id)),
      settings
    );
    // Colours follow the groups of the whole table, so filtering or unticking
    // never repaints the groups that stay.
    const colorOrder = buildSeries(table.rows, settings).series.map(
      series => series.key
    );
    const points = [
      ...new Map(
        candidates.series
          .flatMap(series => series.points)
          .map(point => [point.rowId, point])
      ).values()
    ];

    return {
      ...foldSeries(chosen.series, MAX_GROUPS, colorOrder),
      chosenSeries: chosen.series,
      colorOrder,
      points,
      plotted: chosen.plotted,
      leftOut: candidates.leftOut,
      filteredOut: filtered.filteredOut
    };
  }, [table.rows, settings, filters, unticked]);

  if (!settings || !built) {
    return <p className="text-muted-foreground text-sm">{notEnoughNumbers}</p>;
  }

  const columnOf = (key: string) =>
    table.columns.find(column => column.key === key);
  const xColumn = columnOf(settings.x);
  const yColumn = columnOf(settings.y);
  const errorColumn = settings.error
    ? (columnOf(settings.error) ?? null)
    : null;
  if (!xColumn || !yColumn) return null;

  const formatNumber = (value: number) =>
    format.number(value, { maximumSignificantDigits: 6 });
  const isTicked = (point: PlotPoint) => !unticked.includes(point.rowId);
  const untickedCount = built.points.filter(point => !isTicked(point)).length;
  const setTicked = (point: PlotPoint, isChecked: boolean) =>
    setUntickedIds(
      isChecked
        ? unticked.filter(id => id !== point.rowId)
        : [...unticked, point.rowId]
    );

  const summaryText = [
    t('summary', { count: built.plotted }),
    untickedCount > 0 ? tSelection('unticked', { count: untickedCount }) : null,
    built.filteredOut > 0
      ? tFilters('filteredOut', { count: built.filteredOut })
      : null,
    built.leftOut.missing > 0
      ? t('missing', { count: built.leftOut.missing })
      : null,
    built.leftOut.notPositive > 0
      ? t('notPositive', { count: built.leftOut.notPositive })
      : null,
    built.foldedCount > 0 ? t('folded', { count: built.foldedCount }) : null
  ]
    .filter(Boolean)
    .join(' · ');

  const legend = built.series.map((item, index) => ({
    label: seriesLabel(item, {
      noStudy: t('noStudy'),
      noValue: t('noValue'),
      other: t('other')
    }),
    ...seriesStyle(item, index, built.colorOrder)
  }));
  const groupColumn =
    settings.group.type === 'column' ? columnOf(settings.group.key) : undefined;
  const hasGroups = settings.group.type !== 'none';
  const exportTable = (): ExportTable => ({
    headers: [
      tExport('sample'),
      columnLabel(xColumn),
      columnLabel(yColumn),
      ...(errorColumn ? [columnLabel(errorColumn)] : []),
      ...(hasGroups ? [tExport('group')] : [])
    ],
    rows: built.chosenSeries.flatMap(series =>
      series.points.map(point => [
        point.label,
        point.x,
        point.y,
        ...(errorColumn ? [point.error ?? null] : []),
        ...(hasGroups
          ? [
              seriesLabel(series, {
                noStudy: t('noStudy'),
                noValue: t('noValue'),
                other: t('other')
              })
            ]
          : [])
      ])
    )
  });
  const defaultTitle = tExport('title', {
    y: columnLabel(yColumn),
    x: columnLabel(xColumn)
  });
  const runExport = (exportFormat: ExportFormat) => {
    const title = style.title.trim() || defaultTitle;
    const filterLines = describeFilters(filters, table.columns);
    const lines = captionLines(
      {
        source: sourceLabel ? tExport('source', { name: sourceLabel }) : null,
        filters:
          filterLines.length > 0
            ? tExport('filters', { list: filterLines.join(' · ') })
            : null,
        colour: hasGroups
          ? tExport('colour', {
              name:
                settings.group.type === 'study'
                  ? tControls('groupStudy')
                  : (groupColumn?.name ?? '')
            })
          : null,
        counts: summaryText
      },
      style
    );
    const chartElement = chartRef.current;
    if (!chartElement) return;

    startExport(async () => {
      try {
        await exportPlot(exportFormat, {
          chartElement,
          title,
          lines,
          legend: hasGroups ? legend : [],
          textScale: TEXT_SIZES[style.textSize].scale,
          table: exportTable()
        });
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });
  };

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <PlotControls
        columns={table.columns}
        canGroupByStudy={canGroupByStudy}
        settings={settings}
        onChange={setSettings}
      />
      <PlotFilters
        columns={table.columns}
        rows={table.rows}
        filters={filters}
        onChange={setFilters}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {save && (
          <>
            {save.open && (
              <SavePlotDialog
                projectId={save.projectId}
                experimentId={save.experimentId}
                plot={{ settings, filters, untickedIds: unticked, style }}
                otherNames={save.otherNames.filter(
                  name => name !== save.open?.name
                )}
                existing={save.open}
                label={tSave('update')}
              />
            )}
            <SavePlotDialog
              projectId={save.projectId}
              experimentId={save.experimentId}
              plot={{ settings, filters, untickedIds: unticked, style }}
              otherNames={save.otherNames}
              label={tSave(save.open ? 'saveAs' : 'button')}
              variant={save.open ? 'outline' : 'default'}
            />
          </>
        )}
        <ExportMenu
          isDisabled={built.plotted === 0 || isExporting}
          onExport={runExport}
        />
      </div>
      <PlotStylePanel
        style={style}
        onChange={setStyle}
        defaults={{
          title: defaultTitle,
          xTitle: columnLabel(xColumn),
          yTitle: columnLabel(yColumn)
        }}
        canShowSource={Boolean(sourceLabel)}
      />
      {built.plotted === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        <div ref={chartRef}>
          <ScatterPlot
            series={built.series}
            colorOrder={built.colorOrder}
            xColumn={xColumn}
            yColumn={yColumn}
            errorColumn={errorColumn}
            logX={settings.logX}
            logY={settings.logY}
            plotStyle={style}
          />
        </div>
      )}
      <p className="text-muted-foreground text-sm">{summaryText}</p>
      {built.points.length > 0 && (
        <details open>
          <summary className="cursor-pointer text-sm font-medium">
            {tSelection('title')}
          </summary>
          <p className="text-muted-foreground mt-2 text-xs">
            {tSelection('hint')}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUntickedIds([])}
            >
              {tSelection('selectAll')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUntickedIds(built.points.map(p => p.rowId))}
            >
              {tSelection('selectNone')}
            </Button>
          </div>
          <div className="mt-3 max-h-80 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>{tSelection('column')}</TableHead>
                  <TableHead>{columnLabel(xColumn)}</TableHead>
                  <TableHead>{columnLabel(yColumn)}</TableHead>
                  {errorColumn && (
                    <TableHead>{columnLabel(errorColumn)}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {built.points.map(point => (
                  <TableRow key={point.rowId}>
                    <TableCell>
                      <Checkbox
                        aria-label={tSelection('select', { name: point.label })}
                        checked={isTicked(point)}
                        onCheckedChange={isChecked =>
                          setTicked(point, isChecked === true)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-mono">
                      {point.href ? (
                        <Link
                          href={point.href}
                          className="underline-offset-4 hover:underline"
                        >
                          {point.label}
                        </Link>
                      ) : (
                        point.label
                      )}
                    </TableCell>
                    <TableCell>{formatNumber(point.x)}</TableCell>
                    <TableCell>{formatNumber(point.y)}</TableCell>
                    {errorColumn && (
                      <TableCell>
                        {point.error === undefined
                          ? '-'
                          : formatNumber(point.error)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
      )}
    </div>
  );
};
