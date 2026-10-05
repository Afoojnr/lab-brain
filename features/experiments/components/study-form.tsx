'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useTransition } from 'react';
import { useForm } from 'react-hook-form';
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

import { createStudyAction } from '../actions/create-study';
import { updateStudyAction } from '../actions/update-study';
import { buildStudyFormSchema, isStudyFormError } from '../schemas';
import type { StudyFormValues } from '../schemas';
import type { Study } from '../types';

type StudyFormProps = {
  projectId: string;
  experimentId: string;
  /** Names of the experiment's other studies, for the duplicate check. */
  otherNames: string[];
  /** When set, the form edits this study instead of adding one. */
  study?: Pick<Study, 'id' | 'name' | 'description'>;
  onCancel: () => void;
  onSaved: () => void;
};

/** New or edit study form: validated in the browser with the schema the action re-checks. */
export const StudyForm = ({
  projectId,
  experimentId,
  otherNames,
  study,
  onCancel,
  onSaved
}: StudyFormProps) => {
  const t = useTranslations('studies');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(() => buildStudyFormSchema(otherNames), [otherNames]);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<StudyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: study?.name ?? '',
      description: study?.description ?? ''
    }
  });

  const errorText = (message: string | undefined) =>
    isStudyFormError(message) ? t(`form.errors.${message}`) : undefined;

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        const isSaved = study
          ? await updateStudyAction(projectId, experimentId, study.id, values)
          : Boolean(await createStudyAction(projectId, experimentId, values));
        if (!isSaved) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t(study ? 'updated' : 'created', { name: values.name }));
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
          <FieldLabel htmlFor="study-name">{t('form.nameLabel')}</FieldLabel>
          <Input
            id="study-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <FieldError>{errorText(errors.name?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="study-description">
            {t('form.descriptionLabel')}
          </FieldLabel>
          <Textarea
            id="study-description"
            rows={3}
            aria-invalid={Boolean(errors.description)}
            {...register('description')}
          />
          <FieldDescription>{t('form.descriptionHint')}</FieldDescription>
          <FieldError>{errorText(errors.description?.message)}</FieldError>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {study ? t('form.saveSubmit') : t('form.submit')}
        </Button>
      </div>
    </form>
  );
};
