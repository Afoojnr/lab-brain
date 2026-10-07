'use client';

import { XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

import { deleteDatasetAction } from '../actions/delete-dataset';

type DeleteDatasetDialogProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterizationId: string;
  dataset: { id: string; fileName: string };
};

/** A remove button that asks for confirmation before deleting one attached file. */
export const DeleteDatasetDialog = ({
  projectId,
  experimentId,
  sampleId,
  characterizationId,
  dataset
}: DeleteDatasetDialogProps) => {
  const t = useTranslations('characterizations.files');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      try {
        const wasDeleted = await deleteDatasetAction(
          projectId,
          experimentId,
          sampleId,
          characterizationId,
          dataset.id
        );
        if (!wasDeleted) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('removed', { name: dataset.fileName }));
        setIsOpen(false);
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('remove', { name: dataset.fileName })}
          />
        }
      >
        <XIcon aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('removeTitle', { name: dataset.fileName })}
          </DialogTitle>
          <DialogDescription>{t('removeDescription')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            {t('removeCancel')}
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={remove}>
            {t('removeConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
