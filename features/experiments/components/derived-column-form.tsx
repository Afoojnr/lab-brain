'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useRef, useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { createDerivedColumnAction } from '../actions/create-derived-column';
import { updateDerivedColumnAction } from '../actions/update-derived-column';
import { evaluateFormula, parseFormula } from '../formula';
import { buildDerivedColumnFormSchema, isDerivedFormError } from '../schemas';
import type { DerivedColumnFormValues } from '../schemas';
import type { DerivedColumn, ParameterDefinition, Sample } from '../types';
import { formatDerivedValue } from './format-parameter-value';

type DerivedColumnFormProps = {
  projectId: string;
  experimentId: string;
  /** The experiment's entered columns, which the formula can use (number ones). */
  columns: ParameterDefinition[];
  /** Names of every other column, for the duplicate check. */
  otherNames: string[];
  /** A few samples to preview the result on. */
  previewSamples: Pick<Sample, 'id' | 'code' | 'values'>[];
  /** When set, the form edits this column instead of adding one. */
  derived?: Pick<DerivedColumn, 'id' | 'name' | 'unit'> & {
    formulaText: string;
  };
  onCancel: () => void;
  onSaved: () => void;
};

/**
 * Add or edit a calculated column: a name, a unit and a formula typed with
 * column names, with the columns offered as buttons and a live preview on a
 * few samples. Validated with the schema the actions check again.
 */
export const DerivedColumnForm = ({
  projectId,
  experimentId,
  columns,
  otherNames,
  previewSamples,
  derived,
  onCancel,
  onSaved
}: DerivedColumnFormProps) => {
  const t = useTranslations('derived');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const formulaInput = useRef<HTMLInputElement | null>(null);
  const numberColumns = columns.filter(column => column.kind === 'number');
  const schema = useMemo(
    () => buildDerivedColumnFormSchema(columns, otherNames),
    [columns, otherNames]
  );
  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors }
  } = useForm<DerivedColumnFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: derived?.name ?? '',
      unit: derived?.unit ?? '',
      formula: derived?.formulaText ?? ''
    }
  });
  const formula = useWatch({ control, name: 'formula' });
  const unit = useWatch({ control, name: 'unit' });
  const parsed = useMemo(
    () => parseFormula(formula, columns),
    [formula, columns]
  );

  const errorText = (
    field: 'name' | 'unit' | 'formula',
    message: string | undefined
  ) => {
    if (!isDerivedFormError(message)) return undefined;
    if (field !== 'formula' || parsed.isOk) return t(`form.errors.${message}`);

    return t(`form.errors.${message}`, {
      position: parsed.position + 1,
      name: parsed.name ?? ''
    });
  };

  // Puts `[Column]` where the cursor is, or at the end.
  const insertColumn = (name: string) => {
    const input = formulaInput.current;
    const start = input?.selectionStart ?? formula.length;
    const end = input?.selectionEnd ?? formula.length;
    setValue(
      'formula',
      `${formula.slice(0, start)}[${name}]${formula.slice(end)}`,
      {
        shouldDirty: true
      }
    );
    input?.focus();
  };

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        const isSaved = derived
          ? await updateDerivedColumnAction(
              projectId,
              experimentId,
              derived.id,
              values
            )
          : await createDerivedColumnAction(projectId, experimentId, values);
        if (!isSaved) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t(derived ? 'updated' : 'added', { name: values.name }));
        onSaved();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    })
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="derived-name">{t('form.nameLabel')}</FieldLabel>
          <Input
            id="derived-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <FieldError>{errorText('name', errors.name?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.formula)}>
          <FieldLabel htmlFor="derived-formula">
            {t('form.formulaLabel')}
          </FieldLabel>
          <Controller
            name="formula"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="derived-formula"
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                aria-invalid={Boolean(errors.formula)}
                ref={element => {
                  field.ref(element);
                  formulaInput.current = element;
                }}
              />
            )}
          />
          <div
            className="flex flex-wrap gap-1"
            aria-label={t('form.insertColumn')}
          >
            {numberColumns.map(column => (
              <Button
                key={column.id}
                type="button"
                variant="outline"
                size="xs"
                onClick={() => insertColumn(column.name)}
              >
                {column.name}
              </Button>
            ))}
          </div>
          <FieldDescription>{t('form.formulaHint')}</FieldDescription>
          <FieldError>
            {errorText('formula', errors.formula?.message)}
          </FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.unit)}>
          <FieldLabel htmlFor="derived-unit">{t('form.unitLabel')}</FieldLabel>
          <Input
            id="derived-unit"
            autoComplete="off"
            className="w-40"
            aria-invalid={Boolean(errors.unit)}
            {...register('unit')}
          />
          <FieldDescription>{t('form.unitHint')}</FieldDescription>
          <FieldError>{errorText('unit', errors.unit?.message)}</FieldError>
        </Field>
      </FieldGroup>
      <section
        className="grid gap-1 text-sm"
        aria-label={t('form.previewTitle')}
      >
        <h3 className="font-medium">{t('form.previewTitle')}</h3>
        {previewSamples.length === 0 ? (
          <p className="text-muted-foreground">{t('form.previewNoSamples')}</p>
        ) : !parsed.isOk ? (
          <p className="text-muted-foreground">{t('form.previewInvalid')}</p>
        ) : (
          <ul>
            {previewSamples.map(sample => {
              const value = evaluateFormula(parsed.ast, sample.values);

              return (
                <li key={sample.id}>
                  <span className="font-mono">{sample.code}</span> →{' '}
                  {value === null ? (
                    <span className="text-muted-foreground">
                      {t('form.previewEmpty')}
                    </span>
                  ) : (
                    `${formatDerivedValue(format, value)}${unit.trim() ? ` ${unit.trim()}` : ''}`
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {derived ? t('form.save') : t('form.submit')}
        </Button>
      </div>
    </form>
  );
};
