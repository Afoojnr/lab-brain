'use client';

import { PencilIcon, PlusIcon } from 'lucide-react';
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

import type { ParameterDefinition } from '../types';
import { ParameterForm } from './parameter-form';

type ParameterDialogProps = {
  projectId: string;
  experimentId: string;
  /** Names of the experiment's other parameters. */
  otherNames: string[];
  /** Set to edit this parameter (a small pencil on its row); omit to add one. */
  parameter?: Pick<
    ParameterDefinition,
    'id' | 'name' | 'unit' | 'kind' | 'defaultValue'
  >;
  isKindLocked?: boolean;
};

/** Opens the Add parameter form, or the Edit form for one parameter, in a dialog. */
export const ParameterDialog = ({
  projectId,
  experimentId,
  otherNames,
  parameter,
  isKindLocked
}: ParameterDialogProps) => {
  const t = useTranslations('parameters');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {parameter ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('panel.edit', { name: parameter.name })}
            />
          }
        >
          <PencilIcon aria-hidden />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          <PlusIcon aria-hidden />
          {t('panel.add')}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {parameter
              ? t('form.editTitle', { name: parameter.name })
              : t('form.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>
        <ParameterForm
          projectId={projectId}
          experimentId={experimentId}
          otherNames={otherNames}
          parameter={parameter}
          isKindLocked={isKindLocked}
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
