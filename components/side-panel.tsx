'use client';

import { XIcon } from 'lucide-react';
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SidePanelState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SidePanelContext = createContext<SidePanelState | null>(null);

/** Lets any button open or close the page's side panel (the AI assistant). */
export const SidePanelProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidePanelContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false)
      }}
    >
      {children}
    </SidePanelContext.Provider>
  );
};

export const useSidePanel = (): SidePanelState => {
  const state = useContext(SidePanelContext);
  if (!state) throw new Error('useSidePanel needs a SidePanelProvider');

  return state;
};

/**
 * A column on the right of the page that pushes the content aside (a full-screen
 * sheet on a phone). Its content is created the first time it opens and then
 * kept while it is closed, so a conversation survives closing the panel and
 * moving between pages.
 */
export const SidePanel = ({
  title,
  closeLabel,
  children
}: {
  title: string;
  closeLabel: string;
  children: ReactNode;
}) => {
  const { isOpen, close } = useSidePanel();
  const [hasOpened, setHasOpened] = useState(false);
  if (isOpen && !hasOpened) setHasOpened(true);

  if (!hasOpened) return null;

  return (
    <aside
      aria-label={title}
      hidden={!isOpen}
      className={cn(
        'bg-background flex flex-col',
        'fixed inset-0 z-50 md:sticky md:inset-auto md:top-0 md:z-auto md:h-svh md:w-[26rem] md:shrink-0 md:border-l',
        !isOpen && 'hidden'
      )}
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
        <h2 className="text-sm font-medium">{title}</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={closeLabel}
          onClick={close}
        >
          <XIcon aria-hidden />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  );
};
