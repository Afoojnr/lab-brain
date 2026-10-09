'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import type { ResultColumn } from '../results';
import type { AnalysisValue, ColumnTarget } from '../types';

type TargetSelectProps = {
  value: AnalysisValue;
  target: ColumnTarget;
  /** The experiment's number result columns. */
  columns: ResultColumn[];
  onChange: (target: ColumnTarget) => void;
};

/** Where one value goes: an existing result column, or a new one with its name and unit. */
export const TargetSelect = ({
  value,
  target,
  columns,
  onChange
}: TargetSelectProps) => {
  const t = useTranslations('analysis.results');
  const items = [
    ...columns.map(column => ({
      value: `column:${column.id}`,
      label: column.unit ? `${column.name} (${column.unit})` : column.name
    })),
    { value: 'new', label: t('newColumn') }
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={items}
        value={target.type === 'column' ? `column:${target.columnId}` : 'new'}
        onValueChange={selected => {
          if (selected === null) return;
          onChange(
            selected.startsWith('column:')
              ? { type: 'column', columnId: selected.slice('column:'.length) }
              : { type: 'new', name: value.label, unit: value.unit ?? '' }
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
          {items.map(item => (
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
              onChange({ ...target, name: event.target.value })
            }
          />
          <Input
            aria-label={`${t('newUnit')}: ${value.label}`}
            className="w-20"
            value={target.unit}
            onChange={event =>
              onChange({ ...target, unit: event.target.value })
            }
          />
        </>
      )}
    </div>
  );
};
