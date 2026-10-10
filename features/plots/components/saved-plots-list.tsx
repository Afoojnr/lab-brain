'use client';

import { Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

import { deleteSavedPlotAction } from '../actions/delete-saved-plot';

type SavedPlotsListProps = {
  projectId: string;
  experimentId: string;
  plots: { id: string; name: string }[];
  /** The saved plot that is open, if any. */
  openId: string | null;
};

/** The experiment's saved plots: open one, or delete it (only the plot, never samples). */
export const SavedPlotsList = ({
  projectId,
  experimentId,
  plots,
  openId
}: SavedPlotsListProps) => {
  const t = useTranslations('plots.saved');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // The plot waiting for the user to confirm its deletion.
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(
    null
  );
  const base = `/plots?source=experiment&project=${projectId}&experiment=${experimentId}`;

  const remove = (plot: { id: string; name: string }) =>
    startTransition(async () => {
      try {
        setToDelete(null);
        if (!(await deleteSavedPlotAction(projectId, experimentId, plot.id))) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('deleted', { name: plot.name }));
        if (plot.id === openId) router.push(base);
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <section aria-label={t('title')} className="grid gap-2">
      <h3 className="text-sm font-medium">{t('title')}</h3>
      {plots.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {plots.map(plot => (
            <li key={plot.id} className="flex items-center gap-1">
              <Link
                href={`${base}&plot=${plot.id}`}
                aria-current={plot.id === openId ? 'page' : undefined}
                aria-label={t('open', { name: plot.name })}
                className={buttonVariants({
                  variant: plot.id === openId ? 'default' : 'outline',
                  size: 'sm'
                })}
              >
                {plot.name}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                aria-label={t('delete', { name: plot.name })}
                onClick={() => setToDelete(plot)}
              >
                <Trash2Icon aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={toDelete !== null}
        onOpenChange={isOpen => {
          if (!isOpen) setToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmDescription', { name: toDelete?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setToDelete(null)}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => toDelete && remove(toDelete)}
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
