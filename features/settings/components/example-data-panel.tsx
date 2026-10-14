'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
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

type ExampleDataPanelProps = {
  /** Whether the example projects are in the database now. */
  hasExample: boolean;
  /** Adds them; resolves to whether anything was added. */
  onAdd: () => Promise<boolean>;
  /** Removes them; resolves to how many example projects went. */
  onRemove: () => Promise<number>;
};

/**
 * Adds or removes the example project (the public demo only). Removing asks
 * first, because it deletes the example projects with everything in them.
 */
export const ExampleDataPanel = ({
  hasExample,
  onAdd,
  onRemove
}: ExampleDataPanelProps) => {
  const t = useTranslations('settings.exampleData');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  const add = () =>
    run(async () => {
      toast.success((await onAdd()) ? t('added') : t('alreadyThere'));
    });

  const remove = () =>
    run(async () => {
      await onRemove();
      setIsOpen(false);
      toast.success(t('removed'));
    });

  return (
    <>
      {hasExample ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => setIsOpen(true)}
        >
          {t('remove')}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={add}
        >
          {t('add')}
        </Button>
      )}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('removeTitle')}</DialogTitle>
            <DialogDescription>{t('removeText')}</DialogDescription>
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
              {t('removeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
