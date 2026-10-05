'use client';

import { PlusIcon } from 'lucide-react';
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

import { ExperimentForm } from './experiment-form';

/** Button that opens the New experiment form in a dialog; saving opens the new experiment. */
export const NewExperimentDialog = ({
  projectId,
  otherPrefixes
}: {
  projectId: string;
  otherPrefixes: string[];
}) => {
  const t = useTranslations('experiments.form');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon aria-hidden />
        {t('title')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled form never keeps old values. */}
        <ExperimentForm
          projectId={projectId}
          otherPrefixes={otherPrefixes}
          onCancel={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
