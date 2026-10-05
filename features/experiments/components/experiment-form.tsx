'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';

import { createExperimentAction } from '../actions/create-experiment';
import { updateExperimentAction } from '../actions/update-experiment';
import { buildExperimentFormSchema, isExperimentFormError } from '../schemas';
import type { ExperimentFormValues } from '../schemas';
import type { Experiment } from '../types';

type ExperimentFormProps = {
  projectId: string;
  /** Prefixes of the project's existing experiment, for the duplicate check. */
  otherPrefixes: string[];
  /** When set, the form edits this experiment instead of adding one. */
  experiment?: Pick<Experiment, 'id' | 'name' | 'codePrefix' | 'protocol'>;
  onCancel: () => void;
  /** Called after an edit is saved; adding an experiment opens it instead. */
  onSaved?: () => void;
};

/** New or edit experiment form: validated in the browser with the schema the action re-checks. */
export const ExperimentForm = ({
  projectId,
  otherPrefixes,
  experiment,
  onCancel,
  onSaved
}: ExperimentFormProps) => {
  const t = useTranslations('experiments');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () => buildExperimentFormSchema(otherPrefixes),
    [otherPrefixes]
  );
  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<ExperimentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: experiment?.name ?? '',
      codePrefix: experiment?.codePrefix ?? '',
      protocol: experiment?.protocol ?? ''
    }
  });

  const errorText = (message: string | undefined) =>
    isExperimentFormError(message) ? t(`form.errors.${message}`) : undefined;

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        if (experiment) {
          const isSaved = await updateExperimentAction(
            projectId,
            experiment.id,
            values
          );
          if (!isSaved) {
            toast.error(tErrors('unexpected'));
            return;
          }

          toast.success(t('updated', { name: values.name }));
          onSaved?.();
          return;
        }

        const experimentId = await createExperimentAction(projectId, values);
        if (!experimentId) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('created', { name: values.name }));
        router.push(`/projects/${projectId}/experiments/${experimentId}`);
      } catch {
        toast.error(tErrors('unexpected'));
      }
    })
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="experiment-name">
            {t('form.nameLabel')}
          </FieldLabel>
          <Input
            id="experiment-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <FieldError>{errorText(errors.name?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.codePrefix)}>
          <FieldLabel htmlFor="experiment-code-prefix">
            {t('form.codePrefixLabel')}
          </FieldLabel>
          <Controller
            name="codePrefix"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="experiment-code-prefix"
                autoComplete="off"
                maxLength={6}
                className="font-mono"
                aria-invalid={Boolean(errors.codePrefix)}
                onChange={event =>
                  field.onChange(event.target.value.toUpperCase())
                }
              />
            )}
          />
          <FieldDescription>{t('form.codePrefixHint')}</FieldDescription>
          <FieldError>{errorText(errors.codePrefix?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.protocol)}>
          <FieldLabel htmlFor="experiment-protocol">
            {t('form.protocolLabel')}
          </FieldLabel>
          <Textarea
            id="experiment-protocol"
            rows={4}
            aria-invalid={Boolean(errors.protocol)}
            {...register('protocol')}
          />
          <FieldDescription>{t('form.protocolHint')}</FieldDescription>
          <FieldError>{errorText(errors.protocol?.message)}</FieldError>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {experiment ? t('form.saveSubmit') : t('form.submit')}
        </Button>
      </div>
    </form>
  );
};
