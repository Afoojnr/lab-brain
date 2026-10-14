'use client';

import { useFormatter, useTranslations } from 'next-intl';
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

import {
  backUpNowAction,
  restoreBackupAction
} from '../../actions/data-folder';

type BackupItem = {
  name: string;
  computer: string;
  createdAt: string;
  sizeBytes: number;
};

type BackupsListProps = {
  hasFolder: boolean;
  lastBackupAt: string | null;
  lastBackupError: string | null;
  backups: BackupItem[];
};

/** The backups in the data folder, a button to make one now, and a restore that asks first. */
export const BackupsList = ({
  hasFolder,
  lastBackupAt,
  lastBackupError,
  backups
}: BackupsListProps) => {
  const t = useTranslations('settings.dataFolder');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const router = useRouter();
  const [toRestore, setToRestore] = useState<BackupItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const when = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' });

  const run = (action: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  const backUp = () =>
    run(async () => {
      const result = await backUpNowAction();
      if (result.isOk) toast.success(t('backups.backedUp'));
      else toast.error(t(`errors.${result.code}`));
    });

  const restore = () =>
    run(async () => {
      if (!toRestore) return;

      const result = await restoreBackupAction(toRestore.name);
      setToRestore(null);
      if (result.isOk) toast.success(t('backups.restored'));
      else toast.error(t(`errors.${result.code}`));
    });

  return (
    <div className="mt-8 grid max-w-xl gap-3">
      <h3 className="text-sm font-medium">{t('backups.title')}</h3>
      <p className="text-muted-foreground text-sm">
        {t('backups.description')}
      </p>
      {hasFolder ? (
        <>
          <p className="text-sm" role="status">
            {lastBackupError
              ? t('backups.failed', { error: lastBackupError })
              : lastBackupAt
                ? t('backups.last', { date: when(lastBackupAt) })
                : t('backups.never')}
          </p>
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={backUp}
            >
              {t('backups.backUpNow')}
            </Button>
          </div>
          {backups.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('backups.empty')}
            </p>
          ) : (
            <ul className="divide-border divide-y rounded-md border text-sm">
              {backups.map(backup => (
                <li
                  key={backup.name}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span>
                    {t('backups.from', {
                      computer: backup.computer,
                      date: when(backup.createdAt)
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setToRestore(backup)}
                  >
                    {t('backups.restore')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t('backups.needsFolder')}
        </p>
      )}
      <Dialog
        open={toRestore !== null}
        onOpenChange={open => !open && setToRestore(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('backups.restoreTitle')}</DialogTitle>
            <DialogDescription>
              {toRestore
                ? t('backups.restoreText', {
                    date: when(toRestore.createdAt),
                    computer: toRestore.computer
                  })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setToRestore(null)}
            >
              {t('backups.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={restore}
            >
              {t('backups.restoreConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
