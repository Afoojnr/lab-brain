'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { createSampleAction } from '../../actions/create-sample';
import { updateSampleAction } from '../../actions/update-sample';
import { buildSampleFormSchema } from '../../schemas';
import type { SampleFormValues } from '../../schemas';
import type { ParameterDefinition, Study } from '../../types';
import { StudyField } from './study-field';
import { useErrorText } from './use-error-text';
import { ValueFields } from './value-fields';

type SampleFormProps = {
  projectId: string;
  experimentId: string;
  definitions: ParameterDefinition[];
  /** The experiment's studies a sample can be placed in. */
  studies: Study[];
  /** Codes of the project's other samples, for the duplicate check. */
  otherCodes: string[];
  /** Typed-in starting values; dates as `YYYY-MM-DD` or empty. */
  initial: SampleFormValues;
  /** When set, the form edits this sample instead of adding one. */
  sampleId?: string;
  /** Where Cancel goes back to. */
  cancelHref: string;
};

/** Add or edit one sample: validated in the browser with the schema the actions re-check. */
export const SampleForm = ({
  projectId,
  experimentId,
  definitions,
  studies,
  otherCodes,
  initial,
  sampleId,
  cancelHref
}: SampleFormProps) => {
  const t = useTranslations('samples');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const errorText = useErrorText();
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () => buildSampleFormSchema(definitions, otherCodes),
    [definitions, otherCodes]
  );
  const form = useForm<SampleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
  });
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = form;

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        const saved = sampleId
          ? await updateSampleAction(projectId, experimentId, sampleId, values)
          : await createSampleAction(projectId, experimentId, values);
        if (!saved) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(
          t(sampleId ? 'updated' : 'created', { code: saved.code })
        );
        router.push(
          `/projects/${projectId}/experiments/${experimentId}/samples/${saved.id}`
        );
      } catch {
        toast.error(tErrors('unexpected'));
      }
    })
  );

  return (
    <form onSubmit={submit} noValidate className="grid max-w-3xl gap-8">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.code)}>
          <FieldLabel htmlFor="sample-code">{t('form.codeLabel')}</FieldLabel>
          <Input
            id="sample-code"
            autoComplete="off"
            className="font-mono"
            aria-invalid={Boolean(errors.code)}
            {...register('code')}
          />
          <FieldDescription>{t('form.codeHint')}</FieldDescription>
          <FieldError>{errorText(errors.code?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.performedOn)}>
          <FieldLabel htmlFor="sample-date">{t('form.dateLabel')}</FieldLabel>
          <Input
            id="sample-date"
            type="date"
            aria-invalid={Boolean(errors.performedOn)}
            {...register('performedOn')}
          />
          <FieldDescription>{t('form.dateHint')}</FieldDescription>
          <FieldError>{errorText(errors.performedOn?.message)}</FieldError>
        </Field>
      </FieldGroup>
      <ValueFields form={form} definitions={definitions} />
      <StudyField form={form} studies={studies} />
      <FieldGroup>
        <Field data-invalid={Boolean(errors.implementation)}>
          <FieldLabel htmlFor="sample-implementation">
            {t('form.implementationLabel')}
          </FieldLabel>
          <Textarea
            id="sample-implementation"
            rows={3}
            aria-invalid={Boolean(errors.implementation)}
            {...register('implementation')}
          />
          <FieldDescription>{t('form.implementationHint')}</FieldDescription>
          <FieldError>{errorText(errors.implementation?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.observation)}>
          <FieldLabel htmlFor="sample-observation">
            {t('form.observationLabel')}
          </FieldLabel>
          <Textarea
            id="sample-observation"
            rows={3}
            aria-invalid={Boolean(errors.observation)}
            {...register('observation')}
          />
          <FieldError>{errorText(errors.observation?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.note)}>
          <FieldLabel htmlFor="sample-note">{t('form.noteLabel')}</FieldLabel>
          <Textarea
            id="sample-note"
            rows={2}
            aria-invalid={Boolean(errors.note)}
            {...register('note')}
          />
          <FieldDescription>{t('form.noteHint')}</FieldDescription>
          <FieldError>{errorText(errors.note?.message)}</FieldError>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Link
          href={cancelHref}
          className={buttonVariants({ variant: 'ghost' })}
        >
          {t('form.cancel')}
        </Link>
        <Button type="submit" disabled={isPending}>
          {t('form.submit')}
        </Button>
      </div>
    </form>
  );
};
