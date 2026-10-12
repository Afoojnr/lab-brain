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

import { deleteSavedPlotAction } from '../actions/delete-saved-plot';

type DeleteSavedPlotButtonProps = {
  projectId: string;
  experimentId: string;
  plot: { id: string; name: string };
  /** Called after the plot is deleted, e.g. to leave a page that showed it. */
  onDeleted?: () => void;
};

/** A bin button that asks before deleting a saved plot (only the plot, never samples). */
export const DeleteSavedPlotButton = ({
  projectId,
  experimentId,
  plot,
  onDeleted
}: DeleteSavedPlotButtonProps) => {
  const t = useTranslations('plots.saved');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      try {
        setIsOpen(false);
        if (!(await deleteSavedPlotAction(projectId, experimentId, plot.id))) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('deleted', { name: plot.name }));
        onDeleted?.();
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
        aria-label={t('delete', { name: plot.name })}
        onClick={() => setIsOpen(true)}
      >
        <Trash2Icon aria-hidden />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmDescription', { name: plot.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={remove}
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
