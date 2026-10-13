'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { updateReferenceAction } from '../actions/update-reference';
import { editReferenceSchema, isReferenceFormError } from '../schemas';
import type { EditReferenceValues } from '../schemas';
import type { Reference } from '../types';

type EditableReference = Pick<
  Reference,
  'id' | 'title' | 'authors' | 'year' | 'url' | 'note' | 'summary'
>;

const EditReferenceForm = ({
  projectId,
  reference,
  onCancel,
  onSaved
}: {
  projectId: string;
  reference: EditableReference;
  onCancel: () => void;
  onSaved: () => void;
}) => {
  const t = useTranslations('references.edit');
  const tAdd = useTranslations('references.add');
  const tErrors = useTranslations('references.errors');
  const tCommon = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<EditReferenceValues>({
    resolver: zodResolver(editReferenceSchema),
    defaultValues: {
      title: reference.title,
      authors: reference.authors ?? '',
      year: reference.year === null ? '' : String(reference.year),
      url: reference.url ?? '',
      note: reference.note ?? '',
      summary: reference.summary ?? ''
    }
  });

  const errorText = (message: string | undefined) =>
    isReferenceFormError(message) ? tErrors(message) : undefined;

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        if (!(await updateReferenceAction(projectId, reference.id, values))) {
          toast.error(tCommon('unexpected'));
          return;
        }

        toast.success(t('saved'));
        onSaved();
      } catch {
        toast.error(tCommon('unexpected'));
      }
    })
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="edit-reference-title">
            {tAdd('titleLabel')}
          </FieldLabel>
          <Input
            id="edit-reference-title"
            autoComplete="off"
            aria-invalid={Boolean(errors.title)}
            {...register('title')}
          />
          <FieldError>{errorText(errors.title?.message)}</FieldError>
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field data-invalid={Boolean(errors.authors)}>
            <FieldLabel htmlFor="edit-reference-authors">
              {tAdd('authors')}
            </FieldLabel>
            <Input
              id="edit-reference-authors"
              autoComplete="off"
              {...register('authors')}
            />
            <FieldError>{errorText(errors.authors?.message)}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.year)}>
            <FieldLabel htmlFor="edit-reference-year">
              {tAdd('year')}
            </FieldLabel>
            <Input
              id="edit-reference-year"
              inputMode="numeric"
              autoComplete="off"
              {...register('year')}
            />
            <FieldError>{errorText(errors.year?.message)}</FieldError>
          </Field>
        </div>
        <Field data-invalid={Boolean(errors.url)}>
          <FieldLabel htmlFor="edit-reference-url">{tAdd('url')}</FieldLabel>
          <Input
            id="edit-reference-url"
            autoComplete="off"
            {...register('url')}
          />
          <FieldError>{errorText(errors.url?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.note)}>
          <FieldLabel htmlFor="edit-reference-note">{tAdd('note')}</FieldLabel>
          <Textarea id="edit-reference-note" rows={3} {...register('note')} />
          <FieldError>{errorText(errors.note?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.summary)}>
          <FieldLabel htmlFor="edit-reference-summary">
            {t('summary')}
          </FieldLabel>
          <Textarea
            id="edit-reference-summary"
            rows={6}
            {...register('summary')}
          />
          <FieldDescription>{t('summaryHint')}</FieldDescription>
          <FieldError>{errorText(errors.summary?.message)}</FieldError>
        </Field>
      </FieldGroup>
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

/** A pencil button that opens the Edit reference form (details, note and summary) in a dialog. */
export const EditReferenceDialog = ({
  projectId,
  reference
}: {
  projectId: string;
  reference: EditableReference;
}) => {
  const t = useTranslations('references');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('card.edit', { title: reference.title })}
          />
        }
      >
        <PencilIcon aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
          <DialogDescription>{t('edit.description')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled edit never keeps old values. */}
        <EditReferenceForm
          projectId={projectId}
          reference={reference}
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
