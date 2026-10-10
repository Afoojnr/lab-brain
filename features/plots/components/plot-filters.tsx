'use client';

import { XIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { columnLabel } from '../column-label';
import { distinctValues } from '../filters';
import type { PlotColumn, PlotFilter, PlotRow } from '../types';

/** A number column with up to this many distinct values is filtered by ticking values, else by a range. */
const MAX_TICKED_NUMBERS = 12;

type PlotFiltersProps = {
  columns: PlotColumn[];
  /** Every row of the table, to offer the values each column holds. */
  rows: PlotRow[];
  filters: PlotFilter[];
  onChange: (filters: PlotFilter[]) => void;
};

/**
 * Rules that keep only some samples, such as "Cycles is 600". A column with a
 * few distinct values is filtered by ticking the values to keep; any other
 * number column by a minimum and a maximum. Filters combine with "and".
 */
export const PlotFilters = ({
  columns,
  rows,
  filters,
  onChange
}: PlotFiltersProps) => {
  const t = useTranslations('plots.filters');
  const format = useFormatter();
  const available = columns.filter(
    column =>
      !filters.some(filter => filter.key === column.key) &&
      distinctValues(rows, column.key).length > 0
  );
  const items = available.map(column => ({
    value: column.key,
    label: columnLabel(column)
  }));

  const add = (key: string) => {
    const column = columns.find(item => item.key === key);
    if (!column) return;

    const isTicked =
      column.kind === 'text' ||
      distinctValues(rows, key).length <= MAX_TICKED_NUMBERS;
    onChange([
      ...filters,
      isTicked
        ? { type: 'values', key, values: [] }
        : { type: 'range', key, min: '', max: '' }
    ]);
  };
  const replace = (next: PlotFilter) =>
    onChange(filters.map(filter => (filter.key === next.key ? next : filter)));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <h3 className="pb-2 text-sm font-medium">{t('title')}</h3>
        <Field className="w-full sm:w-52">
          <FieldLabel htmlFor="plot-add-filter">{t('add')}</FieldLabel>
          <Select
            items={items}
            value={null}
            onValueChange={value => {
              if (value) add(value);
            }}
          >
            <SelectTrigger
              id="plot-add-filter"
              className="w-full"
              disabled={items.length === 0}
            >
              <SelectValue placeholder={t('addPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {items.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {filters.length === 0 && (
        <p className="text-muted-foreground text-sm">{t('none')}</p>
      )}
      {filters.map(filter => {
        const column = columns.find(item => item.key === filter.key);
        if (!column) return null;

        return (
          <fieldset
            key={filter.key}
            className="grid gap-2 rounded-lg border p-3"
          >
            <legend className="px-1 text-sm font-medium">
              {columnLabel(column)}
            </legend>
            {filter.type === 'values' ? (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {distinctValues(rows, filter.key).map(value => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={filter.values.includes(value)}
                      onCheckedChange={isChecked =>
                        replace({
                          ...filter,
                          values: isChecked
                            ? [...filter.values, value]
                            : filter.values.filter(item => item !== value)
                        })
                      }
                    />
                    {typeof value === 'number' ? format.number(value) : value}
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {(['min', 'max'] as const).map(bound => (
                  <Field key={bound} className="w-full sm:w-32">
                    <FieldLabel htmlFor={`plot-filter-${filter.key}-${bound}`}>
                      {t(bound)}
                    </FieldLabel>
                    <Input
                      id={`plot-filter-${filter.key}-${bound}`}
                      inputMode="decimal"
                      value={filter[bound]}
                      onChange={event =>
                        replace({ ...filter, [bound]: event.target.value })
                      }
                    />
                  </Field>
                ))}
              </div>
            )}
            {filter.type === 'values' && (
              <p className="text-muted-foreground text-xs">{t('tickHint')}</p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              aria-label={t('remove', { name: column.name })}
              onClick={() =>
                onChange(filters.filter(item => item.key !== filter.key))
              }
            >
              <XIcon aria-hidden />
            </Button>
          </fieldset>
        );
      })}
    </div>
  );
};
