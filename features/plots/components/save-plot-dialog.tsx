'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
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
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { savePlotAction } from '../actions/save-plot';
import { buildSavedPlotFormSchema, isSavedPlotFormError } from '../schemas';
import type { SavedPlotFormValues } from '../schemas';
import type { SavedPlotInput } from '../types';

type SavePlotDialogProps = {
  projectId: string;
  experimentId: string;
  /** What to store besides the title: the plot as it is on screen. */
  plot: Omit<SavedPlotInput, 'name'>;
  /** Titles of the experiment's other saved plots, for the duplicate check. */
  otherNames: string[];
  /** When set, the dialog replaces this saved plot instead of adding one. */
  existing?: { id: string; name: string };
  /** The trigger button's text. */
  label: string;
  variant?: 'default' | 'outline';
};

type FormProps = Omit<SavePlotDialogProps, 'label' | 'variant'> & {
  onDone: () => void;
};

const SavePlotForm = ({
  projectId,
  experimentId,
  plot,
  otherNames,
  existing,
  onDone
}: FormProps) => {
  const t = useTranslations('plots.save');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () => buildSavedPlotFormSchema(otherNames),
    [otherNames]
  );
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SavedPlotFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: existing?.name ?? '' }
  });

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        const id = await savePlotAction(
          projectId,
          experimentId,
          { ...values, ...plot },
          existing?.id
        );
        if (!id) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(
          t(existing ? 'updated' : 'created', { name: values.name })
        );
        onDone();
        // A new plot opens as a saved one, so the next save replaces it.
        if (!existing) {
          router.push(
            `/plots?source=experiment&project=${projectId}&experiment=${experimentId}&plot=${id}`
          );
        } else {
          router.refresh();
        }
      } catch {
        toast.error(tErrors('unexpected'));
      }
    })
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="saved-plot-name">{t('nameLabel')}</FieldLabel>
          <Input
            id="saved-plot-name"
            autoComplete="off"
            placeholder={t('namePlaceholder')}
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <FieldError>
            {isSavedPlotFormError(errors.name?.message)
              ? t(`errors.${errors.name.message}`)
              : undefined}
          </FieldError>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {t('submit')}
        </Button>
      </div>
    </form>
  );
};

/** A button that asks for a title, then saves the plot on screen for the experiment (or replaces the open saved plot). */
export const SavePlotDialog = ({
  label,
  variant = 'default',
  existing,
  ...form
}: SavePlotDialogProps) => {
  const t = useTranslations('plots.save');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={<Button type="button" variant={variant} size="sm" />}
      >
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(existing ? 'updateTitle' : 'title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled form never keeps old values. */}
        <SavePlotForm
          {...form}
          existing={existing}
          onDone={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
