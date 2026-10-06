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

import type { Characterization } from '../types';
import { CharacterizationForm } from './characterization-form';

type CharacterizationDialogProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  knownTechniques: string[];
  /** Set to edit this record (a pencil on its row); omit to add one. */
  characterization?: Pick<
    Characterization,
    'id' | 'technique' | 'measuredOn' | 'note'
  >;
};

/** Opens the Add characterization form, or the Edit form for one record, in a dialog. */
export const CharacterizationDialog = ({
  characterization,
  ...formProps
}: CharacterizationDialogProps) => {
  const t = useTranslations('characterizations');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {characterization ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('panel.edit', {
                technique: characterization.technique
              })}
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
            {characterization
              ? t('form.editTitle', { technique: characterization.technique })
              : t('form.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled form never keeps old values. */}
        <CharacterizationForm
          {...formProps}
          characterization={characterization}
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
