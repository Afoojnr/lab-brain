'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

import { FileDropZone } from '@/components/file-drop/file-drop-zone';
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
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { addReferenceAction } from '../actions/add-reference';
import { MAX_REFERENCES_PER_PROJECT } from '../config/limits';
import type { ReferenceKind } from '../types';

const KINDS: ReferenceKind[] = ['pdf', 'link', 'text'];

type AddReferenceFormProps = {
  projectId: string;
  onCancel: () => void;
  onAdded: () => void;
};

const AddReferenceForm = ({
  projectId,
  onCancel,
  onAdded
}: AddReferenceFormProps) => {
  const t = useTranslations('references.add');
  const tErrors = useTranslations('references.errors');
  const [kind, setKind] = useState<ReferenceKind>('pdf');
  const [pdf, setPdf] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('kind', kind);
    if (kind === 'pdf') {
      if (!pdf) {
        toast.error(tErrors('fileMissing'));
        return;
      }
      formData.set('file', pdf);
    }

    startTransition(async () => {
      try {
        const result = await addReferenceAction(projectId, formData);
        if (!result.ok) {
          toast.error(
            tErrors(result.error, { max: MAX_REFERENCES_PER_PROJECT })
          );
          return;
        }

        toast.success(t('done'));
        onAdded();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div role="group" aria-label={t('kind')} className="flex flex-wrap gap-2">
        {KINDS.map(item => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={kind === item ? 'secondary' : 'outline'}
            aria-pressed={kind === item}
            onClick={() => setKind(item)}
          >
            {t(`kinds.${item}`)}
          </Button>
        ))}
      </div>
      <FieldGroup>
        {kind === 'pdf' && (
          <Field>
            <FileDropZone
              accept=".pdf,application/pdf"
              inputLabel={t('file')}
              title={t('dropTitle')}
              browse={t('browse')}
              hint={t('fileHint')}
              onFiles={([picked]) => setPdf(picked.file)}
            />
            {pdf && (
              <p className="text-sm" aria-live="polite">
                {t('chosen', {
                  name: pdf.name,
                  size: (pdf.size / 1024 / 1024).toFixed(1)
                })}
              </p>
            )}
          </Field>
        )}
        {kind === 'link' && (
          <Field>
            <FieldLabel htmlFor="reference-url">{t('url')}</FieldLabel>
            <Input
              id="reference-url"
              name="url"
              autoComplete="off"
              placeholder={t('urlPlaceholder')}
              required
            />
            <FieldDescription>{t('urlHint')}</FieldDescription>
          </Field>
        )}
        {kind === 'text' && (
          <Field>
            <FieldLabel htmlFor="reference-text">{t('text')}</FieldLabel>
            <Textarea id="reference-text" name="text" rows={8} required />
            <FieldDescription>{t('textHint')}</FieldDescription>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="reference-title">{t('titleLabel')}</FieldLabel>
          <Input id="reference-title" name="title" autoComplete="off" />
          <FieldDescription>{t('titleHint')}</FieldDescription>
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field>
            <FieldLabel htmlFor="reference-authors">{t('authors')}</FieldLabel>
            <Input id="reference-authors" name="authors" autoComplete="off" />
          </Field>
          <Field>
            <FieldLabel htmlFor="reference-year">{t('year')}</FieldLabel>
            <Input
              id="reference-year"
              name="year"
              inputMode="numeric"
              autoComplete="off"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="reference-note">{t('note')}</FieldLabel>
          <Textarea
            id="reference-note"
            name="note"
            rows={3}
            placeholder={t('notePlaceholder')}
          />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t('reading') : t('submit')}
        </Button>
      </div>
    </form>
  );
};

/** Button that opens the Add reference form (PDF, link or DOI, or pasted text) in a dialog. */
export const AddReferenceDialog = ({
  projectId,
  isDisabled
}: {
  projectId: string;
  /** The project is at its limit. */
  isDisabled: boolean;
}) => {
  const t = useTranslations('references');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" disabled={isDisabled} />}>
        <PlusIcon aria-hidden />
        {t('tab.add')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('add.title')}</DialogTitle>
          <DialogDescription>{t('add.description')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled form never keeps old values. */}
        <AddReferenceForm
          projectId={projectId}
          onCancel={() => setIsOpen(false)}
          onAdded={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
