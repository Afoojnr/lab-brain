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

import type { Experiment } from '../types';
import { ExperimentForm } from './experiment-form';

/** Button that opens the Edit experiment form in a dialog; saving closes it. */
export const EditExperimentDialog = ({
  projectId,
  experiment,
  otherPrefixes,
  label,
  variant = 'outline',
  size,
  isOpen: controlledOpen,
  onOpenChange
}: {
  projectId: string;
  experiment: Pick<Experiment, 'id' | 'name' | 'codePrefix' | 'protocol'>;
  /** Prefixes of the project's other experiment. */
  otherPrefixes: string[];
  /** The button's text; defaults to "Edit experiment". */
  label?: string;
  variant?: 'outline' | 'ghost';
  size?: 'default' | 'sm';
  /** Controlled by a menu item: the dialog then has no button of its own. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) => {
  const t = useTranslations('experiments.form');
  const [ownOpen, setOwnOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = controlledOpen ?? ownOpen;
  const setIsOpen = onOpenChange ?? setOwnOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger render={<Button variant={variant} size={size} />}>
          <PencilIcon aria-hidden />
          {label ?? t('editTrigger')}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('editTitle', { name: experiment.name })}</DialogTitle>
          <DialogDescription>{t('editDescription')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled edit never keeps old values. */}
        <ExperimentForm
          projectId={projectId}
          experiment={experiment}
          otherPrefixes={otherPrefixes}
          onCancel={() => setIsOpen(false)}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
