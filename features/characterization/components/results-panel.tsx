'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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

import { checkSelection, formatValue, resolveTarget } from '../results';
import type { ResultColumn } from '../results';
import type { AnalysisValue, ColumnTarget } from '../types';

type ResultsPanelProps = {
  values: AnalysisValue[];
  /** The experiment's number result columns. */
  columns: ResultColumn[];
  /** The sample's stored values by column id, to show what changes. */
  currentValues: Record<string, number | string>;
  selectedIds: string[];
  targets: Record<string, ColumnTarget>;
  /** For the note on a ratio that could not be computed. */
  denominator: string;
  isBusy: boolean;
  onChange: (next: {
    selectedIds: string[];
    targets: Record<string, ColumnTarget>;
  }) => void;
  /** Called with where each chosen value goes, as shown, even for ones the user never touched. */
  onApply: (targets: Record<string, ColumnTarget>) => void;
  onSave: (targets: Record<string, ColumnTarget>) => void;
};

/**
 * The values an analysis produced, each with a tick, the result column it goes
 * to (an existing one, or a new one) and the value it would replace. Nothing is
 * written until the button is pressed.
 */
export const ResultsPanel = ({
  values,
  columns,
  currentValues,
  selectedIds,
  targets,
  denominator,
  isBusy,
  onChange,
  onApply,
  onSave
}: ResultsPanelProps) => {
  const t = useTranslations('analysis.results');
  const resolved = values.map(value => ({
    value,
    target: resolveTarget(value, targets[value.id], columns),
    isSelected: selectedIds.includes(value.id)
  }));
  const chosen = resolved.filter(item => item.isSelected);
  const problem = checkSelection(chosen);
  // What is shown for the chosen values is what is sent and saved.
  const shownTargets = Object.fromEntries(
    chosen.map(item => [item.value.id, item.target])
  );
  const send = (action: (targets: Record<string, ColumnTarget>) => void) => {
    onChange({ selectedIds, targets: { ...targets, ...shownTargets } });
    action(shownTargets);
  };

  const setTarget = (id: string, target: ColumnTarget) =>
    onChange({ selectedIds, targets: { ...targets, [id]: target } });
  const toggle = (id: string, isChecked: boolean) =>
    onChange({
      // Ticking keeps where the value goes as shown, so it is what gets saved.
      selectedIds: isChecked
        ? [...selectedIds, id]
        : selectedIds.filter(other => other !== id),
      targets: {
        ...targets,
        [id]: resolved.find(item => item.value.id === id)?.target ?? {
          type: 'new',
          name: id,
          unit: ''
        }
      }
    });

  const targetItems = [
    ...columns.map(column => ({
      value: `column:${column.id}`,
      label: column.unit ? `${column.name} (${column.unit})` : column.name
    })),
    { value: 'new', label: t('newColumn') }
  ];

  return (
    <div className="grid min-w-0 gap-3">
      <p className="text-muted-foreground text-sm">{t('description')}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>{t('value')}</TableHead>
            <TableHead>{t('target')}</TableHead>
            <TableHead>{t('current')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resolved.map(({ value, target, isSelected }) => {
            const current =
              target.type === 'column'
                ? currentValues[target.columnId]
                : undefined;

            return (
              <TableRow key={value.id}>
                <TableCell>
                  <Checkbox
                    aria-label={value.label}
                    checked={isSelected}
                    onCheckedChange={isChecked => toggle(value.id, isChecked)}
                  />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <span className="font-medium">{value.label}</span>{' '}
                  <span className="tabular-nums">
                    {formatValue(value.value)}
                    {value.unit ? ` ${value.unit}` : ''}
                  </span>
                  {value.flag === 'unavailable' && (
                    <p className="text-muted-foreground text-xs">
                      {t('unavailable', { denominator })}
                    </p>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      items={targetItems}
                      value={
                        target.type === 'column'
                          ? `column:${target.columnId}`
                          : 'new'
                      }
                      onValueChange={selected => {
                        if (selected === null) return;
                        setTarget(
                          value.id,
                          selected.startsWith('column:')
                            ? {
                                type: 'column',
                                columnId: selected.slice('column:'.length)
                              }
                            : {
                                type: 'new',
                                name: value.label,
                                unit: value.unit ?? ''
                              }
                        );
                      }}
                    >
                      <SelectTrigger
                        aria-label={`${t('target')}: ${value.label}`}
                        className="w-48"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targetItems.map(item => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {target.type === 'new' && (
                      <>
                        <Input
                          aria-label={`${t('newName')}: ${value.label}`}
                          className="w-36"
                          value={target.name}
                          onChange={event =>
                            setTarget(value.id, {
                              ...target,
                              name: event.target.value
                            })
                          }
                        />
                        <Input
                          aria-label={`${t('newUnit')}: ${value.label}`}
                          className="w-20"
                          value={target.unit}
                          onChange={event =>
                            setTarget(value.id, {
                              ...target,
                              unit: event.target.value
                            })
                          }
                        />
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {current === undefined
                    ? '—'
                    : typeof current === 'number' && current === value.value
                      ? t('noChange')
                      : String(current)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {problem && (
        <p role="alert" className="text-destructive text-sm">
          {t(problem === 'none' ? 'noneSelected' : problem)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isBusy}
          onClick={() => send(onSave)}
        >
          {t('save')}
        </Button>
        <Button
          type="button"
          disabled={isBusy || problem !== null}
          onClick={() => send(onApply)}
        >
          {t('apply', { count: chosen.length })}
        </Button>
      </div>
    </div>
  );
};
