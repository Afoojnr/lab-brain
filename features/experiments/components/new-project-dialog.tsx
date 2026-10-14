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

import { ProjectForm } from './project-form';

/**
 * Button that opens the New project form in a dialog. `label` replaces the
 * default "New project" text.
 */
export const NewProjectDialog = ({ label }: { label?: string }) => {
  const t = useTranslations('projects.form');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button data-tour="new-project" />}>
        <PlusIcon aria-hidden />
        {label ?? t('title')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled form never keeps old values. */}
        <ProjectForm
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
