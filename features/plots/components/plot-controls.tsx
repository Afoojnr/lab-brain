'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { columnLabel } from '../column-label';
import type { GroupBy, PlotColumn, PlotSettings } from '../types';

const NONE = 'none';
const STUDY = 'study';
const COLUMN_PREFIX = 'column:';

const groupValue = (group: GroupBy) =>
  group.type === 'column' ? `${COLUMN_PREFIX}${group.key}` : group.type;

const toGroup = (value: string): GroupBy =>
  value === STUDY
    ? { type: 'study' }
    : value.startsWith(COLUMN_PREFIX)
      ? { type: 'column', key: value.slice(COLUMN_PREFIX.length) }
      : { type: 'none' };

type PlotControlsProps = {
  columns: PlotColumn[];
  /** Whether rows can be grouped by study (an experiment's samples only). */
  canGroupByStudy: boolean;
  settings: PlotSettings;
  onChange: (settings: PlotSettings) => void;
};

type Item = { value: string; label: string };
/** A heading with its items; no label for items shown above any heading. */
type Section = { label: string | null; items: Item[] };

type ColumnSelectProps = {
  id: string;
  label: string;
  sections: Section[];
  value: string;
  onChange: (value: string) => void;
};

const ColumnSelect = ({
  id,
  label,
  sections,
  value,
  onChange
}: ColumnSelectProps) => (
  <Field className="w-full sm:w-52">
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Select
      items={sections.flatMap(section => section.items)}
      value={value}
      onValueChange={next => {
        if (next) onChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sections
          .filter(section => section.items.length > 0)
          .map(section => (
            <SelectGroup key={section.label ?? ''}>
              {section.label && <SelectLabel>{section.label}</SelectLabel>}
              {section.items.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
      </SelectContent>
    </Select>
  </Field>
);

const ROLE_ORDER = {
  /** X: what you set first. */
  x: ['parameter', 'result', 'calculated'],
  /** Y and error bars: what you measured first, since that is usually plotted. */
  y: ['result', 'calculated', 'parameter']
} as const;

/**
 * What goes on each axis, the error bars, the grouping and the log axes. Only
 * columns of numbers are offered for the axes and the error bars; text columns,
 * number columns (one colour per value) and, for samples, the study for grouping.
 */
export const PlotControls = ({
  columns,
  canGroupByStudy,
  settings,
  onChange
}: PlotControlsProps) => {
  const t = useTranslations('plots.controls');
  const numbers = columns.filter(column => column.kind === 'number');
  const toItem = (column: PlotColumn): Item => ({
    value: column.key,
    label: columnLabel(column)
  });
  // Columns of an experiment are listed under Parameters / Results /
  // Calculated; an uploaded table has no roles, so it is one plain list.
  const numberSections = (order: readonly NonNullable<PlotColumn['role']>[]) =>
    numbers.some(column => column.role)
      ? order.map(role => ({
          label: t(
            role === 'parameter'
              ? 'parameters'
              : role === 'result'
                ? 'results'
                : 'calculated'
          ),
          items: numbers.filter(column => column.role === role).map(toItem)
        }))
      : [{ label: null, items: numbers.map(toItem) }];
  const errorSections = [
    { label: null, items: [{ value: NONE, label: t('errorNone') }] },
    ...numberSections(ROLE_ORDER.y)
  ];
  const groupSections: Section[] = [
    {
      label: null,
      items: [
        { value: NONE, label: t('groupNone') },
        ...(canGroupByStudy ? [{ value: STUDY, label: t('groupStudy') }] : []),
        ...columns
          .filter(column => column.kind === 'text')
          .map(column => ({
            value: `${COLUMN_PREFIX}${column.key}`,
            label: column.name
          }))
      ]
    },
    {
      label: t('groupNumbers'),
      items: numbers.map(column => ({
        value: `${COLUMN_PREFIX}${column.key}`,
        label: columnLabel(column)
      }))
    }
  ];

  return (
    <div className="flex flex-wrap items-end gap-4">
      <ColumnSelect
        id="plot-x"
        label={t('x')}
        sections={numberSections(ROLE_ORDER.x)}
        value={settings.x}
        onChange={x => onChange({ ...settings, x })}
      />
      <ColumnSelect
        id="plot-y"
        label={t('y')}
        sections={numberSections(ROLE_ORDER.y)}
        value={settings.y}
        onChange={y => onChange({ ...settings, y })}
      />
      <ColumnSelect
        id="plot-error"
        label={t('error')}
        sections={errorSections}
        value={settings.error ?? NONE}
        onChange={value =>
          onChange({ ...settings, error: value === NONE ? null : value })
        }
      />
      <ColumnSelect
        id="plot-group"
        label={t('group')}
        sections={groupSections}
        value={groupValue(settings.group)}
        onChange={value => onChange({ ...settings, group: toGroup(value) })}
      />
      <label className="flex items-center gap-2 pb-2 text-sm">
        <Checkbox
          checked={settings.logX}
          onCheckedChange={isChecked =>
            onChange({ ...settings, logX: isChecked === true })
          }
        />
        {t('logX')}
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <Checkbox
          checked={settings.logY}
          onCheckedChange={isChecked =>
            onChange({ ...settings, logY: isChecked === true })
          }
        />
        {t('logY')}
      </label>
    </div>
  );
};
