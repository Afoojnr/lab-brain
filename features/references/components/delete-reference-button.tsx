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
  DialogTitle
} from '@/components/ui/dialog';

import { deleteReferenceAction } from '../actions/delete-reference';

/** A bin button that asks before deleting a reference and the text read from it. */
export const DeleteReferenceButton = ({
  projectId,
  reference
}: {
  projectId: string;
  reference: { id: string; title: string };
}) => {
  const t = useTranslations('references');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      try {
        setIsOpen(false);
        if (!(await deleteReferenceAction(projectId, reference.id))) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('delete.deleted'));
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        aria-label={t('card.delete', { title: reference.title })}
        onClick={() => setIsOpen(true)}
      >
        <Trash2Icon aria-hidden />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>
              {t('delete.description', { title: reference.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              {t('delete.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={remove}
            >
              {t('delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
