'use client';

import { FunctionSquareIcon, PencilIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

import type { DerivedColumn, ParameterDefinition, Sample } from '../types';
import { DerivedColumnForm } from './derived-column-form';

type DerivedColumnDialogProps = {
  projectId: string;
  experimentId: string;
  columns: ParameterDefinition[];
  otherNames: string[];
  previewSamples: Pick<Sample, 'id' | 'code' | 'values'>[];
  /** Set to edit this column (a pencil on its row); omit to add one. */
  derived?: Pick<DerivedColumn, 'id' | 'name' | 'unit'> & {
    formulaText: string;
  };
};

/** Opens the Add calculated column form, or the Edit form for one, in a dialog. */
export const DerivedColumnDialog = ({
  derived,
  ...formProps
}: DerivedColumnDialogProps) => {
  const t = useTranslations('derived');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {derived ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('panel.edit', { name: derived.name })}
            />
          }
        >
          <PencilIcon aria-hidden />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          <FunctionSquareIcon aria-hidden />
          {t('panel.add')}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {derived
              ? t('form.editTitle', { name: derived.name })
              : t('form.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>
        <DerivedColumnForm
          {...formProps}
          derived={derived}
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
