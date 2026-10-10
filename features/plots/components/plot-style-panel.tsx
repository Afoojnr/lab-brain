'use client';

import { useTranslations } from 'next-intl';

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

import { DEFAULT_STYLE } from '../style';
import type { PlotStyle, Size } from '../style';

const SIZES: Size[] = ['small', 'medium', 'large'];

type TextKey =
  'xMin' | 'xMax' | 'yMin' | 'yMax' | 'title' | 'xTitle' | 'yTitle';
type CheckKey = 'showGrid' | 'showSource' | 'showCounts';

type PlotStylePanelProps = {
  style: PlotStyle;
  onChange: (style: PlotStyle) => void;
  /** The titles used when the boxes are empty, shown as placeholders. */
  defaults: { title: string; xTitle: string; yTitle: string };
  /** Experiment plots have a source to show; an uploaded table also has its file. */
  canShowSource: boolean;
};

/**
 * Looks of the plot: axis ranges, titles, text and marker size, grid, and what
 * an exported figure says. Closed until opened, so the controls stay short; on
 * a phone every box takes the full width.
 */
export const PlotStylePanel = ({
  style,
  onChange,
  defaults,
  canShowSource
}: PlotStylePanelProps) => {
  const t = useTranslations('plots.customise');

  const textField = (key: TextKey, label: string, placeholder?: string) => (
    <Field>
      <FieldLabel htmlFor={`plot-style-${key}`}>{label}</FieldLabel>
      <Input
        id={`plot-style-${key}`}
        autoComplete="off"
        placeholder={placeholder}
        inputMode={
          key.endsWith('Min') || key.endsWith('Max') ? 'decimal' : 'text'
        }
        value={style[key]}
        onChange={event => onChange({ ...style, [key]: event.target.value })}
      />
    </Field>
  );
  const sizeField = (key: 'textSize' | 'markerSize', label: string) => {
    const items = SIZES.map(size => ({ value: size, label: t(size) }));

    return (
      <Field>
        <FieldLabel htmlFor={`plot-style-${key}`}>{label}</FieldLabel>
        <Select
          items={items}
          value={style[key]}
          onValueChange={value => {
            if (value) onChange({ ...style, [key]: value as Size });
          }}
        >
          <SelectTrigger id={`plot-style-${key}`} className="w-full">
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
      </Field>
    );
  };
  const checkField = (key: CheckKey, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={style[key]}
        onCheckedChange={isChecked =>
          onChange({ ...style, [key]: isChecked === true })
        }
      />
      {label}
    </label>
  );

  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        {t('title')}
      </summary>
      <div className="mt-4 grid gap-5">
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-medium">{t('range')}</legend>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {textField('xMin', t('xMin'), t('auto'))}
            {textField('xMax', t('xMax'), t('auto'))}
            {textField('yMin', t('yMin'), t('auto'))}
            {textField('yMax', t('yMax'), t('auto'))}
          </div>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-medium">{t('texts')}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {textField('title', t('plotTitle'), defaults.title)}
            {textField('xTitle', t('xTitle'), defaults.xTitle)}
            {textField('yTitle', t('yTitle'), defaults.yTitle)}
          </div>
          <p className="text-muted-foreground text-xs">{t('titleHint')}</p>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-medium">{t('look')}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {sizeField('textSize', t('textSize'))}
            {sizeField('markerSize', t('markerSize'))}
          </div>
          {checkField('showGrid', t('grid'))}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{t('caption')}</legend>
          {canShowSource && checkField('showSource', t('showSource'))}
          {checkField('showCounts', t('showCounts'))}
        </fieldset>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => onChange(DEFAULT_STYLE)}
        >
          {t('reset')}
        </Button>
      </div>
    </details>
  );
};
