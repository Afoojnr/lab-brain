'use client';

import { CompassIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useTourState } from '@/hooks/use-tour-state';

import { useTour } from './tour-provider';

/**
 * Asks, once per page, whether to take its tour. Nothing opens by itself: Start
 * runs the tour, Not now remembers it was declined for this page, and No more
 * tours turns every tour off (they stay available from the help button and
 * Settings).
 */
export const TourPrompt = () => {
  const t = useTranslations('tour.prompt');
  const isMounted = useIsMounted();
  const { tourId, isRunning, start } = useTour();
  const { seen, isOff, markSeen, turnOff } = useTourState();

  if (!isMounted || !tourId || isRunning || isOff || seen.includes(tourId)) {
    return null;
  }

  return (
    <section
      aria-label={t('title')}
      className="bg-popover text-popover-foreground fixed right-4 bottom-4 left-4 z-40 grid gap-3 rounded-xl border p-4 shadow-lg md:right-auto md:left-[calc(var(--sidebar-width,16rem)+1.5rem)] md:w-80"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg"
        >
          <CompassIcon className="size-4" />
        </span>
        <div className="grid gap-0.5">
          <p className="text-sm font-medium">{t('title')}</p>
          <p className="text-muted-foreground text-sm">{t('text')}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={start}>
          {t('start')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => markSeen(tourId)}
        >
          {t('later')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground ml-auto"
          onClick={turnOff}
        >
          {t('never')}
        </Button>
      </div>
    </section>
  );
};
