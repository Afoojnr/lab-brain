'use client';

import { Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { DisabledReason } from '@/components/disabled-reason';
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

import { deleteDerivedColumnAction } from '../actions/delete-derived-column';

type DeleteDerivedColumnDialogProps = {
  projectId: string;
  experimentId: string;
  derived: { id: string; name: string };
  /** The calculated columns whose formulas use it; while any, it cannot be deleted. */
  usedBy?: string[];
};

/** A trash button that asks before removing a calculated column (only its formula; no data is lost). */
export const DeleteDerivedColumnDialog = ({
  projectId,
  experimentId,
  derived,
  usedBy = []
}: DeleteDerivedColumnDialogProps) => {
  const t = useTranslations('derived');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      try {
        const wasDeleted = await deleteDerivedColumnAction(
          projectId,
          experimentId,
          derived.id
        );
        if (!wasDeleted) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('deleted', { name: derived.name }));
        setIsOpen(false);
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DisabledReason
        reason={
          usedBy.length > 0
            ? t('panel.inUseBy', {
                count: usedBy.length,
                names: usedBy.join(', ')
              })
            : null
        }
      >
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('panel.delete', { name: derived.name })}
              disabled={usedBy.length > 0}
            />
          }
        >
          <Trash2Icon aria-hidden />
        </DialogTrigger>
      </DisabledReason>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('delete.title', { name: derived.name })}</DialogTitle>
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
