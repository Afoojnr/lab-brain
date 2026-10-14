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

import type { Project } from '../types';
import { ProjectForm } from './project-form';

/** Button that opens the Edit project form in a dialog; saving closes it. */
export const EditProjectDialog = ({
  project,
  isOpen: controlledOpen,
  onOpenChange
}: {
  project: Pick<Project, 'id' | 'name' | 'description'>;
  /** Controlled by a menu item: the dialog then has no button of its own. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) => {
  const t = useTranslations('projects.form');
  const [ownOpen, setOwnOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = controlledOpen ?? ownOpen;
  const setIsOpen = onOpenChange ?? setOwnOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger render={<Button variant="outline" />}>
          <PencilIcon aria-hidden />
          {t('editTrigger')}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editTitle', { name: project.name })}</DialogTitle>
          <DialogDescription>{t('editDescription')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled edit never keeps old values. */}
        <ProjectForm
          project={project}
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
