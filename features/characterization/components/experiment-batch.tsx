'use client';

import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment, useMemo, useState, useTransition } from 'react';
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

import { applyAnalysisBatchAction } from '../actions/apply-analysis-batch';
import {
  cellChange,
  isAppliedByDefault,
  rowValues,
  valueDefinitions
} from '../batch-preview';
import type { BatchRow } from '../batch-types';
import { checkSelection, formatValue, resolveTarget } from '../results';
import type { ResultColumn } from '../results';
import { DEFAULT_ELEMENTS } from '../techniques/edx/stats';
import type { AnalysisKind, ColumnTarget } from '../types';
import { EdxRatioSelects } from './edx-ratio-selects';
import { EdxSpotsView } from './edx-spots-view';
import { EllipsometrySummaryView } from './ellipsometry-summary-view';
import { TargetSelect } from './target-select';

type ExperimentBatchProps = {
  projectId: string;
  experimentId: string;
  kind: AnalysisKind;
  rows: BatchRow[];
  /** The experiment's number result columns. */
  columns: ResultColumn[];
  initialSelectedIds: string[];
  initialTargets: Record<string, ColumnTarget>;
};

/**
 * An experiment's measurements of one technique, to work on together: tick the
 * samples, leave out bad spots per sample, choose once which values go to which
 * result columns, see what each sample would change, and apply. A sample that
 * would replace a different value is skipped unless you tick Update. The
 * server recomputes every number before it writes.
 */
export const ExperimentBatch = ({
  projectId,
  experimentId,
  kind,
  rows,
  columns,
  initialSelectedIds,
  initialTargets
}: ExperimentBatchProps) => {
  const t = useTranslations('analysis.workspace.experiment');
  const tResults = useTranslations('analysis.results');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const [ratio, setRatio] = useState({ numerator: 'B', denominator: 'N' });
  const [excluded, setExcluded] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      rows.map(row => [row.characterizationId, row.edx?.excludedSpots ?? []])
    )
  );
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [targets, setTargets] = useState(initialTargets);
  const [ticked, setTicked] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const definitions = useMemo(
    () => valueDefinitions(kind, ratio),
    [kind, ratio]
  );
  const chosen = definitions
    .filter(value => selectedIds.includes(value.id))
    .map(value => ({
      value,
      target: resolveTarget(value, targets[value.id], columns)
    }));
  const problem = checkSelection(chosen);
  const elements = useMemo(
    () =>
      [
        ...new Set([
          ...DEFAULT_ELEMENTS,
          ...rows.flatMap(row =>
            (row.edx?.spots ?? []).flatMap(spot => Object.keys(spot.atomic))
          ),
          ratio.numerator,
          ratio.denominator
        ])
      ].sort(),
    [rows, ratio]
  );

  const tickedRows = rows
    .filter(row => ticked.includes(row.characterizationId))
    .map(row => {
      const values = rowValues(
        row,
        ratio,
        excluded[row.characterizationId] ?? []
      );
      const cells = chosen.map(({ value, target }) => {
        const next = values?.find(
          candidate => candidate.id === value.id
        )?.value;
        const current =
          target.type === 'column'
            ? row.currentValues[target.columnId]
            : undefined;

        return {
          id: value.id,
          next,
          current,
          change:
            next === undefined ? ('fill' as const) : cellChange(current, next)
        };
      });
      const isApplied =
        overrides[row.characterizationId] ??
        isAppliedByDefault(cells.map(cell => cell.change));

      return { row, values, cells, isApplied };
    });
  const toApply = tickedRows.filter(item => item.isApplied && item.values);
  const canApply = problem === null && toApply.length > 0;

  const tick = (row: BatchRow, isChecked: boolean) =>
    setTicked(current =>
      isChecked
        ? // Only one measurement per sample can be applied at once.
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

  const apply = () =>
    startTransition(async () => {
      try {
        const count = await applyAnalysisBatchAction(
          projectId,
          experimentId,
          kind,
          {
            settings: {
              numerator: ratio.numerator,
              denominator: ratio.denominator,
              excludedSpots: [],
              datasetId: null,
              selectedValueIds: chosen.map(({ value }) => value.id),
              targets: Object.fromEntries(
                chosen.map(({ value, target }) => [value.id, target])
              )
            },
            rows: toApply.map(({ row }) => ({
              characterizationId: row.characterizationId,
              excludedSpots: excluded[row.characterizationId] ?? []
            }))
          }
        );
        if (count === null) {
          toast.error(t('failed'));
          return;
        }

        toast.success(t('applied', { count }));
        setTicked([]);
        setOverrides({});
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <div className="grid min-w-0 gap-8">
      {kind === 'edx' && (
        <EdxRatioSelects
          elements={elements}
          numerator={ratio.numerator}
          denominator={ratio.denominator}
          idPrefix="batch-edx"
          onChange={(numerator, denominator) =>
            setRatio({ numerator, denominator })
          }
        />
      )}
      <section className="grid min-w-0 gap-2">
        <h3 className="font-medium">{t('valuesTitle')}</h3>
        <p className="text-muted-foreground text-sm">
          {t('valuesDescription')}
        </p>
        <Table>
          <TableBody>
            {definitions.map(value => {
              const isSelected = selectedIds.includes(value.id);
              const target = resolveTarget(value, targets[value.id], columns);

              return (
                <TableRow key={value.id}>
                  <TableCell className="w-8">
                    <Checkbox
                      aria-label={value.label}
                      checked={isSelected}
                      onCheckedChange={isChecked => {
                        setSelectedIds(current =>
                          isChecked
                            ? [...current, value.id]
                            : current.filter(id => id !== value.id)
                        );
                        setTargets(current => ({
                          ...current,
                          [value.id]: target
                        }));
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{value.label}</TableCell>
                  <TableCell className="whitespace-normal">
                    <TargetSelect
                      value={value}
                      target={target}
                      columns={columns}
                      onChange={next =>
                        setTargets(current => ({
                          ...current,
                          [value.id]: next
                        }))
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {problem && (
          <p role="alert" className="text-destructive text-sm">
            {tResults(problem === 'none' ? 'noneSelected' : problem)}
          </p>
        )}
      </section>
      <section className="grid min-w-0 gap-2">
        <h3 className="font-medium">{t('rowsTitle')}</h3>
        <p className="text-muted-foreground text-sm">{t('rowsDescription')}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t('sample')}</TableHead>
              {kind === 'edx' && <TableHead>{t('spots')}</TableHead>}
              {chosen.map(({ value }) => (
                <TableHead key={value.id}>{value.label}</TableHead>
              ))}
              <TableHead>{t('update')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => {
              const id = row.characterizationId;
              const left = excluded[id] ?? [];
              const values = rowValues(row, ratio, left);
              const preview = tickedRows.find(item => item.row === row);
              const isOpen = openId === id;
              const label = `${row.sampleCode}${row.measuredOn ? ` · ${row.measuredOn}` : ''}`;

              return (
                <Fragment key={id}>
                  <TableRow>
                    <TableCell>
                      <Checkbox
                        aria-label={t('tick', { sample: label })}
                        checked={ticked.includes(id)}
                        disabled={values === null}
                        onCheckedChange={isChecked => tick(row, isChecked)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={t(isOpen ? 'hideDetails' : 'details', {
                          sample: label
                        })}
                        className="flex items-center gap-1 font-medium"
                        onClick={() => setOpenId(isOpen ? null : id)}
                      >
                        {isOpen ? (
                          <ChevronDownIcon aria-hidden className="size-4" />
                        ) : (
                          <ChevronRightIcon aria-hidden className="size-4" />
                        )}
                        {label}
                      </button>
                    </TableCell>
                    {kind === 'edx' && (
                      <TableCell className="text-muted-foreground text-sm">
                        {values === null && (row.edx?.spots.length ?? 0) === 0
                          ? t('noReadable')
                          : t('spotsOf', {
                              included:
                                (row.edx?.spots.length ?? 0) - left.length,
                              total: row.edx?.spots.length ?? 0
                            })}
                        {(row.edx?.problems.length ?? 0) > 0 && (
                          <span className="text-destructive block text-xs">
                            {t('filesUnreadable', {
                              count: row.edx?.problems.length ?? 0
                            })}
                          </span>
                        )}
                      </TableCell>
                    )}
                    {chosen.map(({ value }, index) => {
                      const cell = preview?.cells[index];

                      return (
                        <TableCell
                          key={value.id}
                          className="tabular-nums"
                          data-change={cell?.change}
                        >
                          {!preview || cell?.next === undefined ? (
                            <span className="text-muted-foreground">
                              {values === null && kind !== 'edx'
                                ? t(
                                    `reasons.${row.ellipsometry?.reason === 'noFile' ? 'noFile' : 'notSeqfit'}`
                                  )
                                : '—'}
                            </span>
                          ) : (
                            <span
                              className={
                                cell.change === 'replace'
                                  ? 'text-destructive'
                                  : undefined
                              }
                            >
                              {cell.change === 'replace'
                                ? t('replaceCell', {
                                    current: String(cell.current),
                                    next: formatValue(cell.next)
                                  })
                                : t(
                                    cell.change === 'same'
                                      ? 'sameCell'
                                      : 'fillCell',
                                    {
                                      next: formatValue(cell.next)
                                    }
                                  )}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      {preview && (
                        <Checkbox
                          aria-label={t('updateRow', { sample: label })}
                          checked={preview.isApplied}
                          onCheckedChange={isChecked =>
                            setOverrides(current => ({
                              ...current,
                              [id]: isChecked
                            }))
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell
                        colSpan={4 + chosen.length}
                        className="whitespace-normal"
                      >
                        {row.edx ? (
                          <EdxSpotsView
                            spots={row.edx.spots}
                            problems={row.edx.problems}
                            isRatioFixed
                            settings={{ ...ratio, excludedSpots: left }}
                            onChange={next =>
                              setExcluded(current => ({
                                ...current,
                                [id]: next.excludedSpots
                              }))
                            }
                          />
                        ) : row.ellipsometry?.summary ? (
                          <EllipsometrySummaryView
                            summary={row.ellipsometry.summary}
                          />
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {t(
                              `reasons.${row.ellipsometry?.reason === 'noFile' ? 'noFile' : 'notSeqfit'}`
                            )}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </section>
      <div className="flex flex-col items-end gap-2">
        {ticked.length === 0 && (
          <p className="text-muted-foreground text-sm">{t('pickSamples')}</p>
        )}
        <Button type="button" disabled={!canApply || isPending} onClick={apply}>
          {t('apply', { count: toApply.length })}
        </Button>
      </div>
    </div>
  );
};
