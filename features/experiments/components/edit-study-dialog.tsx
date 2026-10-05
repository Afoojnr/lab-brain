'use client';

import { PencilIcon } from 'lucide-react';
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

import type { Study } from '../types';
import { StudyForm } from './study-form';

/** A small pencil that opens the Edit study form in a dialog; saving closes it. */
export const EditStudyDialog = ({
  projectId,
  experimentId,
  study,
  otherNames
}: {
  projectId: string;
  experimentId: string;
  study: Pick<Study, 'id' | 'name' | 'description'>;
  /** Names of the experiment's other studies. */
  otherNames: string[];
}) => {
  const t = useTranslations('studies');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('panel.edit', { name: study.name })}
          />
        }
      >
        <PencilIcon aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('form.editTitle', { name: study.name })}</DialogTitle>
          <DialogDescription>{t('form.editDescription')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled edit never keeps old values. */}
        <StudyForm
          projectId={projectId}
          experimentId={experimentId}
          study={study}
          otherNames={otherNames}
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
