'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
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

import { createProjectAction } from '../actions/create-project';
import { isProjectFormError, projectFormSchema } from '../schemas';
import type { ProjectFormValues } from '../schemas';

type ProjectFormProps = {
  onCancel: () => void;
  onCreated: () => void;
};

/** New project form: validated in the browser with the same schema the action re-checks. */
export const ProjectForm = ({ onCancel, onCreated }: ProjectFormProps) => {
  const t = useTranslations('projects');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: '', codePrefix: '', protocol: '' }
  });

  const errorText = (message: string | undefined) =>
    isProjectFormError(message) ? t(`form.errors.${message}`) : undefined;

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        await createProjectAction(values);
        toast.success(t('created', { name: values.name }));
        onCreated();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    })
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="project-name">{t('form.nameLabel')}</FieldLabel>
          <Input
            id="project-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <FieldError>{errorText(errors.name?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.codePrefix)}>
          <FieldLabel htmlFor="project-code-prefix">
            {t('form.codePrefixLabel')}
          </FieldLabel>
          <Controller
            name="codePrefix"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="project-code-prefix"
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
          <FieldLabel htmlFor="project-protocol">
            {t('form.protocolLabel')}
          </FieldLabel>
          <Textarea
            id="project-protocol"
            rows={3}
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
          {t('form.submit')}
        </Button>
      </div>
    </form>
  );
};
