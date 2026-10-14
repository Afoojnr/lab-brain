'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { MarkdownEditor } from '@/components/markdown/markdown-editor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';

import { updateProjectBackgroundAction } from '../actions/update-project-background';
import {
  isProjectBackgroundError,
  projectBackgroundSchema
} from '../schemas/schemas';
import type { ProjectBackgroundValues } from '../schemas/schemas';

type BackgroundFormProps = {
  projectId: string;
  background: string | null;
  onCancel: () => void;
  onSaved: () => void;
};

const BackgroundForm = ({
  projectId,
  background,
  onCancel,
  onSaved
}: BackgroundFormProps) => {
  const t = useTranslations('projects.background');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<ProjectBackgroundValues>({
    resolver: zodResolver(projectBackgroundSchema),
    defaultValues: { background: background ?? '' }
  });

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        if (!(await updateProjectBackgroundAction(projectId, values))) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('saved'));
        onSaved();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    })
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <Field data-invalid={Boolean(errors.background)}>
        <FieldLabel htmlFor="project-background">{t('label')}</FieldLabel>
        <Controller
          name="background"
          control={control}
          render={({ field }) => (
            <MarkdownEditor
              id="project-background"
              rows={14}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isInvalid={Boolean(errors.background)}
            />
          )}
        />
        <FieldError>
          {isProjectBackgroundError(errors.background?.message)
            ? t(`errors.${errors.background.message}`)
            : undefined}
        </FieldError>
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {t('save')}
        </Button>
      </div>
    </form>
  );
};

/** Button that opens the background editor (formatted text) in a dialog; saving closes it. */
export const EditBackgroundDialog = ({
  projectId,
  background
}: {
  projectId: string;
  background: string | null;
}) => {
  const t = useTranslations('projects.background');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon aria-hidden />
        {background ? t('edit') : t('add')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled edit never keeps old text. */}
        <BackgroundForm
          projectId={projectId}
          background={background}
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
