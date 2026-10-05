'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from '@/components/ui/combobox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';

import type { SampleFormValues } from '../../schemas';
import type { Study } from '../../types';

type StudyFieldProps = {
  form: UseFormReturn<SampleFormValues>;
  studies: Study[];
};

/** Multi-select of the experiment's studies; a sample can belong to several. Hidden when there are none. */
export const StudyField = ({ form, studies }: StudyFieldProps) => {
  const t = useTranslations('samples.form');
  const anchor = useComboboxAnchor();
  const nameById = new Map(studies.map(study => [study.id, study.name]));

  if (studies.length === 0) return null;

  return (
    <Field>
      <FieldLabel htmlFor="sample-studies">{t('studiesLabel')}</FieldLabel>
      <Controller
        name="studyIds"
        control={form.control}
        render={({ field }) => (
          <Combobox
            multiple
            items={studies.map(study => study.id)}
            itemToStringLabel={id => nameById.get(id) ?? id}
            value={field.value}
            onValueChange={field.onChange}
          >
            <ComboboxChips ref={anchor}>
              <ComboboxValue>
                {(selectedIds: string[]) => (
                  <>
                    {selectedIds.map(id => (
                      <ComboboxChip key={id}>{nameById.get(id)}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput
                      id="sample-studies"
                      placeholder={
                        selectedIds.length === 0
                          ? t('studiesPlaceholder')
                          : undefined
                      }
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
              <ComboboxEmpty>{t('studiesNoMatch')}</ComboboxEmpty>
              <ComboboxList>
                {(id: string) => (
                  <ComboboxItem key={id} value={id}>
                    {nameById.get(id)}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}
      />
      <FieldDescription>{t('studiesHint')}</FieldDescription>
    </Field>
  );
};
