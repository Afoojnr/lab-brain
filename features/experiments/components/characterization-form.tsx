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

import { createCharacterizationAction } from '../actions/create-characterization';
import { updateCharacterizationAction } from '../actions/update-characterization';
import {
  characterizationFormSchema,
  isCharacterizationFormError
} from '../schemas';
import type { CharacterizationFormValues } from '../schemas';
import type { Characterization } from '../types';

type CharacterizationFormProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  /** Techniques already used in the project, offered as one-click choices. */
  knownTechniques: string[];
  /** When set, the form edits this record instead of adding one. */
  characterization?: Pick<
    Characterization,
    'id' | 'technique' | 'measuredOn' | 'note'
  >;
  onCancel: () => void;
  onSaved: () => void;
};

/** Add or edit one characterization: validated in the browser with the schema the actions re-check. */
export const CharacterizationForm = ({
  projectId,
  experimentId,
  sampleId,
  knownTechniques,
  characterization,
  onCancel,
  onSaved
}: CharacterizationFormProps) => {
  const t = useTranslations('characterizations');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors }
  } = useForm<CharacterizationFormValues>({
    resolver: zodResolver(characterizationFormSchema),
    defaultValues: {
      technique: characterization?.technique ?? '',
      measuredOn: characterization?.measuredOn ?? '',
      note: characterization?.note ?? ''
    }
  });

  const errorText = (message: string | undefined) =>
    isCharacterizationFormError(message)
      ? t(`form.errors.${message}`)
      : undefined;

  const submit = handleSubmit(values =>
    startTransition(async () => {
      try {
        const wasSaved = characterization
          ? await updateCharacterizationAction(
              projectId,
              experimentId,
              sampleId,
              characterization.id,
              values
            )
          : await createCharacterizationAction(
              projectId,
              experimentId,
              sampleId,
              values
            );
        if (!wasSaved) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(
          t(characterization ? 'updated' : 'added', {
            technique: values.technique
          })
        );
        onSaved();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    })
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.technique)}>
          <FieldLabel htmlFor="characterization-technique">
            {t('form.techniqueLabel')}
          </FieldLabel>
          <Input
            id="characterization-technique"
            autoComplete="off"
            aria-invalid={Boolean(errors.technique)}
            {...register('technique')}
          />
          {knownTechniques.length > 0 && (
            <div
              role="group"
              aria-label={t('form.knownTechniques')}
              className="flex flex-wrap items-center gap-1.5"
            >
              <span className="text-muted-foreground text-xs">
                {t('form.knownTechniques')}:
              </span>
              {knownTechniques.map(technique => (
                <Button
                  key={technique}
                  type="button"
                  variant="outline"
                  size="xs"
                  aria-label={t('form.useTechnique', { technique })}
                  onClick={() =>
                    setValue('technique', technique, { shouldValidate: true })
                  }
                >
                  {technique}
                </Button>
              ))}
            </div>
          )}
          <FieldDescription>{t('form.techniqueHint')}</FieldDescription>
          <FieldError>{errorText(errors.technique?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.measuredOn)}>
          <FieldLabel htmlFor="characterization-date">
            {t('form.dateLabel')}
          </FieldLabel>
          <Input
            id="characterization-date"
            type="date"
            aria-invalid={Boolean(errors.measuredOn)}
            {...register('measuredOn')}
          />
          <FieldDescription>{t('form.dateHint')}</FieldDescription>
          <FieldError>{errorText(errors.measuredOn?.message)}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.note)}>
          <FieldLabel htmlFor="characterization-note">
            {t('form.noteLabel')}
          </FieldLabel>
          <Textarea
            id="characterization-note"
            rows={2}
            aria-invalid={Boolean(errors.note)}
            {...register('note')}
          />
          <FieldDescription>{t('form.noteHint')}</FieldDescription>
          <FieldError>{errorText(errors.note?.message)}</FieldError>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {characterization ? t('form.save') : t('form.submit')}
        </Button>
      </div>
    </form>
  );
};
