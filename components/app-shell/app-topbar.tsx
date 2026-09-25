'use client';

import { PanelLeftIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Translucent bar that stays put while content scrolls underneath it. Holds the
 * sidebar toggle; the generated shadcn trigger hardcodes an English label.
 */
export const AppTopbar = () => {
  const t = useTranslations('navigation');
  const { toggleSidebar } = useSidebar();

  return (
    <div className="glass-bar border-border/60 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('toggleSidebar')}
        onClick={toggleSidebar}
      >
        <PanelLeftIcon aria-hidden />
      </Button>
    </div>
  );
};
