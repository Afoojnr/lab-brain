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

type ColumnSectionProps = ValueFieldsProps & {
  sectionId: string;
  title: string;
  hint: string;
};

/** One input per column in a group. Empty means the value was not recorded. */
const ColumnSection = ({
  form,
  definitions,
  sectionId,
  title,
  hint
}: ColumnSectionProps) => {
  const errorText = useErrorText();
  const {
    register,
    formState: { errors }
  } = form;

  return (
    <section aria-labelledby={sectionId} className="space-y-4">
      <div className="space-y-1">
        <h2 id={sectionId} className="text-base font-medium">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </div>
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
    </section>
  );
};

/**
 * The experiment's columns as inputs, in two groups: the parameters you set
 * and the results you measured. Either group is left out when empty.
 */
export const ValueFields = ({ form, definitions }: ValueFieldsProps) => {
  const t = useTranslations('samples.form');
  const parameters = definitions.filter(
    definition => definition.role === 'parameter'
  );
  const results = definitions.filter(
    definition => definition.role === 'result'
  );

  if (definitions.length === 0) {
    return (
      <section aria-labelledby="values-title" className="space-y-1">
        <h2 id="values-title" className="text-base font-medium">
          {t('valuesTitle')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('noColumns')}</p>
      </section>
    );
  }

  return (
    <>
      {parameters.length > 0 && (
        <ColumnSection
          form={form}
          definitions={parameters}
          sectionId="values-title"
          title={t('valuesTitle')}
          hint={t('valuesHint')}
        />
      )}
      {results.length > 0 && (
        <ColumnSection
          form={form}
          definitions={results}
          sectionId="results-title"
          title={t('resultsTitle')}
          hint={t('resultsHint')}
        />
      )}
    </>
  );
};
