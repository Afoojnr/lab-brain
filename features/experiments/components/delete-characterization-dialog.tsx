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

import { deleteCharacterizationAction } from '../actions/delete-characterization';

type DeleteCharacterizationDialogProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterization: { id: string; technique: string };
};

/** A trash button that asks for confirmation before removing one characterization. */
export const DeleteCharacterizationDialog = ({
  projectId,
  experimentId,
  sampleId,
  characterization
}: DeleteCharacterizationDialogProps) => {
  const t = useTranslations('characterizations');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      try {
        const wasDeleted = await deleteCharacterizationAction(
          projectId,
          experimentId,
          sampleId,
          characterization.id
        );
        if (!wasDeleted) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('deleted', { technique: characterization.technique }));
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
            size="icon-sm"
            aria-label={t('panel.delete', {
              technique: characterization.technique
            })}
          />
        }
      >
        <Trash2Icon aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('delete.title', { technique: characterization.technique })}
          </DialogTitle>
          <DialogDescription>{t('delete.description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            {t('delete.cancel')}
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={remove}>
            {t('delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
