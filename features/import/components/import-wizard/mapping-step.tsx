'use client';

import { useTranslations } from 'next-intl';

import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { ParameterDefinition } from '@/features/experiments/shared';

import { dataCells, headersOf, unitsOf } from '../../build-payload';
import type { SheetLayout } from '../../build-payload';
import { cellToText, isBlank } from '@/lib/spreadsheet/cells';
import { hasAmbiguousDates } from '../../dates';
import type { DateFormat } from '../../dates';
import { guessKind } from '@/lib/spreadsheet/layout';
import type { ColumnTarget, NewColumnTarget, ParsedSheet } from '../../types';
import { targetToValue, valueToTarget } from './mapping-options';

type MappingStepProps = {
  sheet: ParsedSheet;
  layout: SheetLayout;
  /** The target experiment's columns; empty for a new experiment. */
  columns: ParameterDefinition[];
  mapping: ColumnTarget[];
  dateFormat: DateFormat;
  onMappingChange: (mapping: ColumnTarget[]) => void;
  onDateFormatChange: (format: DateFormat) => void;
};

const FIELD_TYPES = [
  'ignore',
  'code',
  'date',
  'implementation',
  'observation',
  'note',
  'studies'
] as const;
const EXAMPLE_COUNT = 3;

/** Step 4: one row per source column with examples and a choice of what it becomes. */
export const MappingStep = ({
  sheet,
  layout,
  columns,
  mapping,
  dateFormat,
  onMappingChange,
  onDateFormatChange
}: MappingStepProps) => {
  const t = useTranslations('import.mapping');
  const headers = headersOf(sheet, layout);
  const units = unitsOf(sheet, layout);

  const update = (index: number, target: ColumnTarget) =>
    onMappingChange(mapping.map((old, i) => (i === index ? target : old)));
  const isTaken = (value: string, index: number) =>
    mapping.some((target, i) => i !== index && targetToValue(target) === value);

  const options = [
    ...FIELD_TYPES.map(type => ({
      value: type,
      label: t(`targets.${type}`)
    })),
    ...columns.map(column => ({
      value: `column:${column.id}`,
      label: t('targets.existingColumn', { name: column.name })
    })),
    { value: 'newColumn', label: t('targets.newColumn') }
  ];

  const dateIndex = mapping.findIndex(target => target.type === 'date');
  const needsDateFormat =
    dateIndex !== -1 && hasAmbiguousDates(dataCells(sheet, layout, dateIndex));
  const dateItems = (['iso', 'dmy', 'mdy'] as const).map(format => ({
    value: format,
    label: t(`dateFormat.${format}`)
  }));

  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground text-sm">{t('description')}</p>
      <ul className="grid gap-3">
        {headers.map((header, index) => {
          const target = mapping[index] ?? { type: 'ignore' };
          const cells = dataCells(sheet, layout, index);
          const examples = [
            ...new Set(
              cells.filter(cell => !isBlank(cell)).map(cell => cellToText(cell))
            )
          ].slice(0, EXAMPLE_COUNT);

          return (
            <li
              key={index}
              className="grid min-w-0 gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:items-start"
            >
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">
                  {t('columnHeader')}
                </p>
                <p className="font-medium break-words">
                  {header || t('noHeader')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">
                  {t('examplesHeader')}
                </p>
                <p className="text-sm break-words">
                  {examples.length > 0 ? examples.join(' · ') : t('noExamples')}
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor={`import-target-${index}`}>
                  {t('targetHeader')}
                </FieldLabel>
                <Select
                  items={options}
                  value={targetToValue(target)}
                  onValueChange={value =>
                    update(
                      index,
                      valueToTarget(
                        value ?? 'ignore',
                        header,
                        units[index] ?? '',
                        columns,
                        guessKind(cells)
                      )
                    )
                  }
                >
                  <SelectTrigger
                    id={`import-target-${index}`}
                    aria-label={`${t('targetHeader')}: ${header || t('noHeader')}`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(option => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={
                          option.value !== 'ignore' &&
                          option.value !== 'newColumn' &&
                          isTaken(option.value, index)
                        }
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {target.type === 'newColumn' && (
                <NewColumnFields
                  index={index}
                  target={target}
                  onChange={next => update(index, next)}
                />
              )}
            </li>
          );
        })}
      </ul>
      {needsDateFormat && (
        <Field>
          <FieldLabel htmlFor="import-date-format">
            {t('dateFormat.label')}
          </FieldLabel>
          <Select
            items={dateItems}
            value={dateFormat}
            onValueChange={value => {
              const format = dateItems.find(item => item.value === value);
              if (format) onDateFormatChange(format.value);
            }}
          >
            <SelectTrigger id="import-date-format" className="w-full sm:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateItems.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
};

type NewColumnFieldsProps = {
  index: number;
  target: NewColumnTarget;
  onChange: (target: NewColumnTarget) => void;
};

/** Name, unit, type and kind of a column the import creates. */
const NewColumnFields = ({ index, target, onChange }: NewColumnFieldsProps) => {
  const t = useTranslations('import.mapping.newColumn');
  const kindItems = (['number', 'text'] as const).map(value => ({
    value,
    label: t(value)
  }));
  const roleItems = (['parameter', 'result'] as const).map(value => ({
    value,
    label: t(value)
  }));

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 md:col-span-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,1.3fr)]">
      <Field>
        <FieldLabel htmlFor={`import-new-column-name-${index}`}>
          {t('name')}
        </FieldLabel>
        <Input
          id={`import-new-column-name-${index}`}
          autoComplete="off"
          value={target.name}
          onChange={event => onChange({ ...target, name: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`import-new-column-unit-${index}`}>
          {t('unit')}
        </FieldLabel>
        <Input
          id={`import-new-column-unit-${index}`}
          autoComplete="off"
          value={target.unit}
          onChange={event => onChange({ ...target, unit: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`import-new-column-kind-${index}`}>
          {t('kind')}
        </FieldLabel>
        <Select
          items={kindItems}
          value={target.kind}
          onValueChange={value => {
            const kind = kindItems.find(item => item.value === value);
            if (kind) onChange({ ...target, kind: kind.value });
          }}
        >
          <SelectTrigger
            id={`import-new-column-kind-${index}`}
            className="w-full min-w-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kindItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor={`import-new-column-role-${index}`}>
          {t('role')}
        </FieldLabel>
        <Select
          items={roleItems}
          value={target.role}
          onValueChange={value => {
            const role = roleItems.find(item => item.value === value);
            if (role) onChange({ ...target, role: role.value });
          }}
        >
          <SelectTrigger
            id={`import-new-column-role-${index}`}
            className="w-full min-w-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
};
