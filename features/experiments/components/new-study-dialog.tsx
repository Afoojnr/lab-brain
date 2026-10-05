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

import { StudyForm } from './study-form';

/** Button that opens the New study form in a dialog; saving closes it. */
export const NewStudyDialog = ({
  projectId,
  experimentId,
  otherNames
}: {
  projectId: string;
  experimentId: string;
  otherNames: string[];
}) => {
  const t = useTranslations('studies');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon aria-hidden />
        {t('panel.add')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('form.title')}</DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled form never keeps old values. */}
        <StudyForm
          projectId={projectId}
          experimentId={experimentId}
          otherNames={otherNames}
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
