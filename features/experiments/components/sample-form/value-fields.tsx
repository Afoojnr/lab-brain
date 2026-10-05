'use client';

import { useTranslations } from 'next-intl';
import type { UseFormReturn } from 'react-hook-form';

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import type { SampleFormValues } from '../../schemas';
import type { ParameterDefinition } from '../../types';
import { ParameterLabel } from '../parameter-label';
import { useErrorText } from './use-error-text';

type ValueFieldsProps = {
  form: UseFormReturn<SampleFormValues>;
  definitions: ParameterDefinition[];
};

/** One input per column of the experiment. Empty means the value was not recorded. */
export const ValueFields = ({ form, definitions }: ValueFieldsProps) => {
  const t = useTranslations('samples.form');
  const errorText = useErrorText();
  const {
    register,
    formState: { errors }
  } = form;

  return (
    <section aria-labelledby="values-title" className="space-y-4">
      <div className="space-y-1">
        <h2 id="values-title" className="text-base font-medium">
          {t('valuesTitle')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {definitions.length > 0 ? t('valuesHint') : t('noColumns')}
        </p>
      </div>
      {definitions.length > 0 && (
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          {definitions.map(definition => {
            const error = errors.values?.[definition.id];

            return (
              <Field key={definition.id} data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={`value-${definition.id}`}>
                  <ParameterLabel definition={definition} />
                </FieldLabel>
                <Input
                  id={`value-${definition.id}`}
                  autoComplete="off"
                  inputMode={definition.kind === 'number' ? 'decimal' : 'text'}
                  aria-invalid={Boolean(error)}
                  {...register(`values.${definition.id}`)}
                />
                <FieldError>{errorText(error?.message)}</FieldError>
              </Field>
            );
          })}
        </FieldGroup>
      )}
    </section>
  );
};
