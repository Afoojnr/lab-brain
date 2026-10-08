'use client';

import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

import { ViewerBody } from './viewer-body';
import type { ViewerItem } from './viewer-body';

const ViewerContext = createContext<((id: string) => void) | null>(null);

/**
 * Opens a larger view of any of `items` in a dialog, with next and previous
 * through them. Wrap a list of files in it and put a {@link ViewFileTrigger}
 * on each file that can be shown; the rest stays a plain download link.
 */
export const FileViewer = ({
  items,
  children
}: {
  items: ViewerItem[];
  children: ReactNode;
}) => {
  const t = useTranslations('common.fileViewer');
  const [activeId, setActiveId] = useState<string | null>(null);
  const index = items.findIndex(item => item.id === activeId);
  const item = items[index];
  const go = (offset: number) =>
    setActiveId(
      items[(index + offset + items.length) % items.length]?.id ?? null
    );

  return (
    <ViewerContext.Provider value={setActiveId}>
      {children}
      <Dialog
        open={item !== undefined}
        onOpenChange={isOpen => {
          if (!isOpen) setActiveId(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          {item && (
            <>
              <DialogHeader>
                <DialogTitle className="break-words">{item.label}</DialogTitle>
                <DialogDescription>{t('dialogDescription')}</DialogDescription>
              </DialogHeader>
              <div className="min-w-0">
                <ViewerBody key={item.id} item={item} />
              </div>
              <DialogFooter className="items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  {items.length > 1 && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={t('previous')}
                        onClick={() => go(-1)}
                      >
                        <ChevronLeftIcon aria-hidden />
                      </Button>
                      <span className="text-muted-foreground text-sm">
                        {t('position', {
                          current: index + 1,
                          total: items.length
                        })}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={t('next')}
                        onClick={() => go(1)}
                      >
                        <ChevronRightIcon aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
                <a
                  href={item.url}
                  className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                >
                  <DownloadIcon aria-hidden className="size-4" />
                  {t('download')}
                </a>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ViewerContext.Provider>
  );
};

/** Wraps a file's thumbnail or name so clicking it opens the viewer on that file. */
export const ViewFileTrigger = ({
  id,
  label,
  className,
  children
}: {
  id: string;
  /** Accessible name of the button. */
  label: string;
  className?: string;
  children: ReactNode;
}) => {
  const open = useContext(ViewerContext);

  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      onClick={() => open?.(id)}
    >
      {children}
    </button>
  );
};
