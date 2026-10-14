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

import { deleteBondAction } from '../actions/ftir-bonds';

/** A bin button that asks before removing a bond from the table. */
export const FtirBondDeleteButton = ({
  bond
}: {
  bond: { id: string; bond: string };
}) => {
  const t = useTranslations('analysis.ftir.bonds');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      try {
        setIsOpen(false);
        if (!(await deleteBondAction(bond.id))) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('deleted'));
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
        aria-label={t('delete', { bond: bond.bond })}
        onClick={() => setIsOpen(true)}
      >
        <Trash2Icon aria-hidden />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>{t('deleteDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={remove}>
              {t('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
