'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
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
import { cellChange, isAppliedByDefault } from '../batch/batch-preview';
import type { FtirBatchRow } from '../batch/batch-types';
import {
  checkSelection,
  formatValue,
  resolveTarget
} from '../analysis/results';
import type { ResultColumn } from '../analysis/results';
import type { ProcessedSpectrum } from '../techniques/ftir/process';
import { ftirValues } from '../techniques/ftir/values';
import type { FtirSettings } from '../techniques/ftir/types';
import type { AnalysisValue, ColumnTarget } from '../types';
import { TargetSelect } from './target-select';

type FtirBatchSendProps = {
  projectId: string;
  experimentId: string;
  /** The ticked samples, each with its processed spectrum. */
  items: { row: FtirBatchRow; label: string; processed: ProcessedSpectrum }[];
  settings: FtirSettings;
  /** The peaks as values (id, label, unit), for choosing where each goes. */
  definitions: AnalysisValue[];
  columns: ResultColumn[];
  selectedIds: string[];
  targets: Record<string, ColumnTarget>;
  onChange: (next: {
    selectedIds: string[];
    targets: Record<string, ColumnTarget>;
  }) => void;
};

/**
 * Choosing which peak values go to which result columns, for every ticked
 * sample at once; what each sample would change; and applying. A sample that
 * would replace a different value is skipped unless you tick Update, and one
 * with no data near a chosen peak cannot be applied.
 */
export const FtirBatchSend = ({
  projectId,
  experimentId,
  items,
  settings,
  definitions,
  columns,
  selectedIds,
  targets,
  onChange
}: FtirBatchSendProps) => {
  const t = useTranslations('analysis.workspace.experiment');
  const tResults = useTranslations('analysis.results');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const chosen = definitions
    .filter(value => selectedIds.includes(value.id))
    .map(value => ({
      value,
      target: resolveTarget(value, targets[value.id], columns)
    }));
  const problem = checkSelection(chosen);
  const previews = items.map(item => {
    const values = ftirValues(item.processed, settings);
    const cells = chosen.map(({ value, target }) => {
      const next = values.find(candidate => candidate.id === value.id)?.value;
      const current =
        target.type === 'column'
          ? item.row.currentValues[target.columnId]
          : undefined;

      return {
        id: value.id,
        next,
        current,
        change:
          next === undefined ? ('fill' as const) : cellChange(current, next)
      };
    });
    const hasAll = cells.every(cell => cell.next !== undefined);
    const id = item.row.characterizationId;

    return {
      ...item,
      cells,
      hasAll,
      isApplied:
        hasAll &&
        (overrides[id] ?? isAppliedByDefault(cells.map(cell => cell.change)))
    };
  });
  const toApply = previews.filter(item => item.isApplied);

  const apply = () =>
    startTransition(async () => {
      try {
        const count = await applyAnalysisBatchAction(
          projectId,
          experimentId,
          'ftir',
          {
            settings: {
              // Only the EDX uses the ratio; the shape needs something.
              numerator: 'B',
              denominator: 'N',
              excludedSpots: [],
              datasetId: null,
              ftir: settings,
              selectedValueIds: chosen.map(({ value }) => value.id),
              targets: Object.fromEntries(
                chosen.map(({ value, target }) => [value.id, target])
              )
            },
            rows: toApply.map(item => ({
              characterizationId: item.row.characterizationId,
              excludedSpots: []
            }))
          }
        );
        if (count === null) {
          toast.error(t('failed'));
          return;
        }
        toast.success(t('applied', { count }));
        setOverrides({});
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <section className="grid min-w-0 gap-4">
      <h3 className="font-medium">{t('valuesTitle')}</h3>
      <p className="text-muted-foreground text-sm">
        {t('ftirValuesDescription')}
      </p>
      {definitions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('ftirNoPeaks')}</p>
      ) : (
        <Table>
          <TableBody>
            {definitions.map(value => {
              const target = resolveTarget(value, targets[value.id], columns);

              return (
                <TableRow key={value.id}>
                  <TableCell className="w-8">
                    <Checkbox
                      aria-label={value.label}
                      checked={selectedIds.includes(value.id)}
                      onCheckedChange={isChecked =>
                        onChange({
                          selectedIds: isChecked
                            ? [...selectedIds, value.id]
                            : selectedIds.filter(id => id !== value.id),
                          targets: { ...targets, [value.id]: target }
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{value.label}</TableCell>
                  <TableCell className="whitespace-normal">
                    <TargetSelect
                      value={value}
                      target={target}
                      columns={columns}
                      onChange={next =>
                        onChange({
                          selectedIds,
                          targets: { ...targets, [value.id]: next }
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {problem && definitions.length > 0 && (
        <p role="alert" className="text-destructive text-sm">
          {tResults(problem === 'none' ? 'noneSelected' : problem)}
        </p>
      )}
      {chosen.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('sample')}</TableHead>
              {chosen.map(({ value }) => (
                <TableHead key={value.id}>{value.label}</TableHead>
              ))}
              <TableHead>{t('update')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previews.map(item => (
              <TableRow key={item.row.characterizationId}>
                <TableCell className="font-medium">{item.label}</TableCell>
                {item.cells.map(cell => (
                  <TableCell
                    key={cell.id}
                    className="tabular-nums"
                    data-change={cell.change}
                  >
                    {cell.next === undefined ? (
                      <span className="text-muted-foreground text-xs">
                        {t('ftirNoData')}
                      </span>
                    ) : cell.change === 'replace' ? (
                      <span className="text-destructive">
                        {t('replaceCell', {
                          current: String(cell.current),
                          next: formatValue(cell.next)
                        })}
                      </span>
                    ) : (
                      t(cell.change === 'same' ? 'sameCell' : 'fillCell', {
                        next: formatValue(cell.next)
                      })
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <Checkbox
                    aria-label={t('updateRow', { sample: item.label })}
                    checked={item.isApplied}
                    disabled={!item.hasAll}
                    onCheckedChange={isChecked =>
                      setOverrides(current => ({
                        ...current,
                        [item.row.characterizationId]: isChecked
                      }))
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={problem !== null || toApply.length === 0 || isPending}
          onClick={apply}
        >
          {t('apply', { count: toApply.length })}
        </Button>
      </div>
    </section>
  );
};
