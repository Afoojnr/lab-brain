'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
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

import { createProjectAction } from '../actions/create-project';
import { updateProjectAction } from '../actions/update-project';
import { isProjectFormError, projectFormSchema } from '../schemas';
import type { ProjectFormValues } from '../schemas';
import type { Project } from '../types';

type ProjectFormProps = {
  /** When set, the form edits this project instead of adding one. */
  project?: Pick<Project, 'id' | 'name' | 'description'>;
  onCancel: () => void;
  onSaved: () => void;
};

/** New or edit project form: validated in the browser with the same schema the actions re-check. */
export const ProjectForm = ({
  project,
  onCancel,
  onSaved
}: ProjectFormProps) => {
  const t = useTranslations('projects');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? ''
    }
  });

  const errorText = (message: string | undefined) =>
    isProjectFormError(message) ? t(`form.errors.${message}`) : undefined;

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        if (project) {
          const isSaved = await updateProjectAction(project.id, values);
          if (!isSaved) {
            toast.error(tErrors('unexpected'));
            return;
          }

          toast.success(t('updated', { name: values.name }));
        } else {
          await createProjectAction(values);
          toast.success(t('created', { name: values.name }));
        }
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
          <FieldLabel htmlFor="project-name">{t('form.nameLabel')}</FieldLabel>
          <Input
            id="project-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <FieldError>{errorText(errors.name?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="project-description">
            {t('form.descriptionLabel')}
          </FieldLabel>
          <Textarea
            id="project-description"
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
          {project ? t('form.saveSubmit') : t('form.submit')}
        </Button>
      </div>
    </form>
  );
};
