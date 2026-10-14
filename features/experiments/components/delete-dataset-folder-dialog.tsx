'use client';

import { Trash2Icon } from 'lucide-react';
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

import { deleteDatasetFolderAction } from '../actions/delete-dataset-folder';

type DeleteDatasetFolderDialogProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterizationId: string;
  folder: string;
  fileCount: number;
};

/** A bin button that asks once, then removes a whole uploaded folder and its files. */
export const DeleteDatasetFolderDialog = ({
  projectId,
  experimentId,
  sampleId,
  characterizationId,
  folder,
  fileCount
}: DeleteDatasetFolderDialogProps) => {
  const t = useTranslations('characterizations.files');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      try {
        const count = await deleteDatasetFolderAction(
          projectId,
          experimentId,
          sampleId,
          characterizationId,
          folder
        );
        if (count === null) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('folderRemoved', { name: folder, count }));
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
            aria-label={t('removeFolder', { name: folder })}
          />
        }
      >
        <Trash2Icon aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('removeFolderTitle', { name: folder, count: fileCount })}
          </DialogTitle>
          <DialogDescription>{t('removeFolderDescription')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            {t('removeCancel')}
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={remove}>
            {t('removeFolderConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
