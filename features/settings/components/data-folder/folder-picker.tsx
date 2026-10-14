'use client';

import { ArrowUpIcon, FolderIcon, FolderPlusIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

import {
  browseFoldersAction,
  createFolderAction
} from '../../actions/browse-folders';
import type { BrowseResult } from '../../actions/browse-folders';

type Listing = Extract<BrowseResult, { isOk: true }>;

type FolderPickerProps = {
  /** Where to start; null means the current data folder or the home folder. */
  startAt: string | null;
  /** Whether a folder is already in use: the button then says Change folder. */
  hasFolder?: boolean;
  isDisabled?: boolean;
  /** Called with the folder the user selected. */
  onSelect: (folder: string) => void;
};

/**
 * A folder browser: click through the folders of this computer and select one,
 * instead of typing its path. It only lists folder names, never file contents.
 */
export const FolderPicker = ({
  startAt,
  hasFolder,
  isDisabled,
  onSelect
}: FolderPickerProps) => {
  const t = useTranslations('settings.dataFolder.picker');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  const [newName, setNewName] = useState('');
  const [isPending, startTransition] = useTransition();

  const open = (folder: string | null, canFallBack = false) =>
    startTransition(async () => {
      try {
        let result = await browseFoldersAction(folder);
        // A typed path that is not a folder starts at the default instead.
        if (!result.isOk && canFallBack && folder !== null) {
          result = await browseFoldersAction(null);
        }
        if (result.isOk) setListing(result);
        else toast.error(t(`errors.${result.reason}`));
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  const create = () =>
    startTransition(async () => {
      if (!listing) return;

      try {
        const result = await createFolderAction(listing.path, newName);
        if (!result.isOk) {
          toast.error(t(`errors.${result.reason}`));
          return;
        }
        setNewName('');
        const next = await browseFoldersAction(result.path);
        if (next.isOk) setListing(next);
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setListing(null);
      setNewName('');
      open(startAt, true);
    }
    setIsOpen(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" disabled={isDisabled} />
        }
      >
        <FolderIcon aria-hidden />
        {hasFolder ? t('change') : t('choose')}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t('up')}
              disabled={isPending || !listing?.parent}
              onClick={() => listing?.parent && open(listing.parent)}
            >
              <ArrowUpIcon aria-hidden />
            </Button>
            <p
              className="text-muted-foreground min-w-0 flex-1 truncate"
              title={listing?.path}
            >
              <span className="sr-only">{t('location')}: </span>
              {listing?.path ?? '…'}
            </p>
          </div>
          <ul
            aria-label={t('folders')}
            className="divide-border max-h-64 divide-y overflow-y-auto rounded-md border"
          >
            {listing && listing.folders.length === 0 && (
              <li className="text-muted-foreground px-3 py-2">{t('empty')}</li>
            )}
            {listing?.folders.map(folder => (
              <li key={folder.path}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => open(folder.path)}
                  className="hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left outline-none"
                >
                  <FolderIcon
                    aria-hidden
                    className="text-muted-foreground size-4 shrink-0"
                  />
                  <span className="truncate">{folder.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              aria-label={t('newFolderName')}
              placeholder={t('newFolderName')}
              autoComplete="off"
              value={newName}
              onChange={event => setNewName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && newName.trim() !== '') {
                  event.preventDefault();
                  create();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isPending || newName.trim() === '' || !listing}
              onClick={create}
            >
              <FolderPlusIcon aria-hidden />
              {t('create')}
            </Button>
          </div>
        </div>
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
            disabled={isPending || !listing}
            onClick={() => {
              if (!listing) return;
              onSelect(listing.path);
              setIsOpen(false);
            }}
          >
            {t('select')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
