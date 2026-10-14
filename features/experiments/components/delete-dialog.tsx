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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import type { Counts } from '../cascade/count-records';

export type DeleteKind = 'study' | 'sample' | 'experiment' | 'project';

export type DeleteDetails = {
  kind: DeleteKind;
  /** What goes with it, by kind of thing; zeros are left out. */
  counts?: Partial<Counts> & { references?: number };
  /** Study only: how many samples carry it (they stay, losing the tag). */
  sampleCount?: number;
  /** Saved plots and analyses go too (their count is not known here). */
  hasSavedData?: boolean;
  /** Project only: the background goes with the record. */
  hasBackground?: boolean;
  /** The exact name the user must type; none when the delete only asks once. */
  confirmName?: string;
  /** The server action; it checks everything again, including the typed name. */
  onDelete: (typedName: string) => Promise<boolean>;
  /** Where to go once it is gone. */
  afterHref: string;
};

const COUNT_KEYS = [
  'experiments',
  'samples',
  'characterizations',
  'files',
  'columns',
  'studies',
  'references'
] as const;

const DeleteBody = ({
  details,
  onClose
}: {
  details: DeleteDetails;
  onClose: () => void;
}) => {
  const {
    kind,
    counts = {},
    sampleCount,
    hasSavedData = false,
    hasBackground = false,
    confirmName,
    onDelete,
    afterHref
  } = details;
  const t = useTranslations('experiments.delete');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [isPending, startTransition] = useTransition();
  const isConfirmed = confirmName === undefined || typed.trim() === confirmName;
  // The record itself is not "what goes with it".
  const own =
    kind === 'experiment'
      ? 'experiments'
      : kind === 'sample'
        ? 'samples'
        : null;
  const lines = COUNT_KEYS.filter(
    key => key !== own && (counts[key] ?? 0) > 0
  ).map(key => t(`counts.${key}`, { count: counts[key] ?? 0 }));
  if (hasSavedData) lines.push(t('counts.savedPlots'));
  if (hasBackground) lines.push(t('counts.background'));

  const remove = () =>
    startTransition(async () => {
      try {
        if (!(await onDelete(typed))) {
          toast.error(t('failed'));
          return;
        }

        toast.success(t(`${kind}.done`));
        onClose();
        router.push(afterHref);
        router.refresh();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t(`${kind}.title`)}</DialogTitle>
        <DialogDescription>{t('irreversible')}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 text-sm">
        {kind === 'study' ? (
          <p>{t('study.keeps', { count: sampleCount ?? 0 })}</p>
        ) : (
          <>
            <p className="font-medium">{t('removes')}</p>
            <ul className="list-disc pl-5">
              {lines.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        )}
        {confirmName !== undefined && (
          <Field>
            <FieldLabel htmlFor={`delete-${kind}-name`}>
              {t('nameLabel')}
            </FieldLabel>
            <Input
              id={`delete-${kind}-name`}
              autoComplete="off"
              value={typed}
              onChange={event => setTyped(event.target.value)}
            />
            <FieldDescription>
              {t.rich('typeName', {
                name: confirmName,
                strong: chunks => (
                  <strong className="text-foreground font-semibold">
                    {chunks}
                  </strong>
                )
              })}
            </FieldDescription>
          </Field>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={!isConfirmed || isPending}
          onClick={remove}
        >
          {t(`${kind}.confirm`)}
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * The confirmation for deleting a study, sample, experiment or project: a
 * dialog that lists what goes with the record, with counts; a project or an
 * experiment also needs its exact name typed before Delete works. Nothing is
 * deleted until then, and there is no undo. It starts fresh on every open.
 */
export const DeleteDialog = ({
  details,
  isOpen,
  onOpenChange
}: {
  details: DeleteDetails;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
      {isOpen && (
        <DeleteBody details={details} onClose={() => onOpenChange(false)} />
      )}
    </DialogContent>
  </Dialog>
);
