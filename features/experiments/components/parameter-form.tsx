'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useTransition } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { createParameterDefinitionAction } from '../actions/create-parameter-definition';
import { updateParameterDefinitionAction } from '../actions/update-parameter-definition';
import { buildParameterFormSchema, isParameterFormError } from '../schemas';
import type { ParameterFormValues } from '../schemas';
import type { ParameterDefinition } from '../types';

type ParameterFormProps = {
  projectId: string;
  experimentId: string;
  /** Names of the experiment's other parameters, for the duplicate check. */
  otherNames: string[];
  /** When set, the form edits this parameter instead of adding one. */
  parameter?: Pick<
    ParameterDefinition,
    'id' | 'name' | 'unit' | 'kind' | 'defaultValue'
  >;
  /** True once samples hold values for the parameter, so its type cannot change. */
  isKindLocked?: boolean;
  onCancel: () => void;
  onSaved: () => void;
};

/** Add or edit one parameter: validated in the browser with the schema the actions re-check. */
export const ParameterForm = ({
  projectId,
  experimentId,
  otherNames,
  parameter,
  isKindLocked = false,
  onCancel,
  onSaved
}: ParameterFormProps) => {
  const t = useTranslations('parameters');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () => buildParameterFormSchema(otherNames),
    [otherNames]
  );
  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<ParameterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: parameter?.name ?? '',
      unit: parameter?.unit ?? '',
      kind: parameter?.kind ?? 'number',
      defaultValue:
        parameter?.defaultValue === null ||
        parameter?.defaultValue === undefined
          ? ''
          : String(parameter.defaultValue)
    }
  });
  const kind = useWatch({ control, name: 'kind' });

  const kindItems = [
    { value: 'number', label: t('kinds.number') },
    { value: 'text', label: t('kinds.text') }
  ];

  const errorText = (message: string | undefined) =>
    isParameterFormError(message) ? t(`form.errors.${message}`) : undefined;

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        const wasSaved = parameter
          ? await updateParameterDefinitionAction(
              projectId,
              experimentId,
              parameter.id,
              values
            )
          : await createParameterDefinitionAction(
              projectId,
              experimentId,
              values
            );

        if (!wasSaved) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(
          t(parameter ? 'updated' : 'added', { name: values.name })
        );
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
          <FieldLabel htmlFor="parameter-name">
            {t('form.nameLabel')}
          </FieldLabel>
          <Input
            id="parameter-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <FieldError>{errorText(errors.name?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.unit)}>
          <FieldLabel htmlFor="parameter-unit">
            {t('form.unitLabel')}
          </FieldLabel>
          <Input
            id="parameter-unit"
            autoComplete="off"
            aria-invalid={Boolean(errors.unit)}
            {...register('unit')}
          />
          <FieldDescription>{t('form.unitHint')}</FieldDescription>
          <FieldError>{errorText(errors.unit?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.kind)}>
          <FieldLabel htmlFor="parameter-kind">
            {t('form.kindLabel')}
          </FieldLabel>
          <Controller
            name="kind"
            control={control}
            render={({ field }) => (
              <Select
                items={kindItems}
                value={field.value}
                onValueChange={value => field.onChange(value)}
                disabled={isKindLocked}
              >
                <SelectTrigger id="parameter-kind" className="w-40">
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
            )}
          />
          {isKindLocked && (
            <FieldDescription>{t('form.kindLocked')}</FieldDescription>
          )}
          <FieldError>{errorText(errors.kind?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.defaultValue)}>
          <FieldLabel htmlFor="parameter-default">
            {t('form.defaultLabel')}
          </FieldLabel>
          <Input
            id="parameter-default"
            autoComplete="off"
            inputMode={kind === 'number' ? 'decimal' : 'text'}
            aria-invalid={Boolean(errors.defaultValue)}
            {...register('defaultValue')}
          />
          <FieldDescription>{t('form.defaultHint')}</FieldDescription>
          <FieldError>{errorText(errors.defaultValue?.message)}</FieldError>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {t(parameter ? 'form.save' : 'form.submit')}
        </Button>
      </div>
    </form>
  );
};
