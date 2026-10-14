'use client';

import type { Driver } from 'driver.js';
import { usePathname } from 'next/navigation';
import { useMessages, useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { ReactNode } from 'react';

import { useSidebar } from '@/components/ui/sidebar';
import { useTourState } from '@/components/tour/use-tour-state';

import { buildSteps, TOURS, tourIdForPath } from './tours';
import type { TourId } from './tours';

type TourContextValue = {
  /** The tour that belongs to the page being shown, if any. */
  tourId: TourId | null;
  /** A tour is on screen now. */
  isRunning: boolean;
  /** Runs the page's tour, whether or not it was seen before. */
  start: () => void;
};

const TourContext = createContext<TourContextValue>({
  tourId: null,
  isRunning: false,
  start: () => undefined
});

export const useTour = () => useContext(TourContext);

type StepCopy = Record<string, Record<string, { title: string; text: string }>>;

/** How long a collapsed sidebar needs to open before its items can be spotlighted. */
const SIDEBAR_OPENING_MS = 250;

/** Runs the guided tour of the page being shown. */
export const TourProvider = ({ children }: { children: ReactNode }) => {
  const t = useTranslations('tour');
  const messages = useMessages();
  const pathname = usePathname();
  const { isMobile, state, setOpen } = useSidebar();
  const { markSeen } = useTourState();
  const tourId = tourIdForPath(pathname);
  const [isRunning, setIsRunning] = useState(false);
  const running = useRef<Driver | null>(null);

  // Ends the tour on screen without counting it as seen (leaving the page, or
  // starting another one).
  const stop = useCallback(() => {
    const instance = running.current;
    running.current = null;
    instance?.destroy();
    setIsRunning(false);
  }, []);

  // A tour belongs to its page: leaving the page ends it.
  useEffect(() => stop, [pathname, stop]);

  const start = useCallback(async () => {
    if (!tourId) return;

    if (!isMobile && state === 'collapsed') {
      setOpen(true);
      await new Promise(resolve => setTimeout(resolve, SIDEBAR_OPENING_MS));
    }
    const steps = buildSteps(TOURS[tourId], {
      isMobile,
      exists: selector => document.querySelector(selector) !== null
    });
    if (steps.length === 0) return;

    const { driver } = await import('driver.js');
    const copy: StepCopy = messages.tour.steps;
    stop();
    const instance = driver({
      showProgress: true,
      progressText: t('controls.progress', {
        current: '{{current}}',
        total: '{{total}}'
      }),
      nextBtnText: t('controls.next'),
      prevBtnText: t('controls.previous'),
      doneBtnText: t('controls.done'),
      showButtons: ['next', 'previous', 'close'],
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 8,
      steps: steps.map(step => ({
        element: step.selector,
        popover: {
          title: copy[tourId]?.[step.id]?.title ?? '',
          description: copy[tourId]?.[step.id]?.text ?? '',
          side: step.side,
          align: 'start'
        }
      })),
      // Esc, the × and Done all arrive here. (`onDestroyed` is not reliably
      // called by the library, so the end is handled before it destroys.)
      onDestroyStarted: () => {
        markSeen(tourId);
        stop();
      }
    });
    running.current = instance;
    setIsRunning(true);
    instance.drive();
  }, [tourId, isMobile, state, setOpen, t, messages, markSeen, stop]);

  const value = useMemo(
    () => ({ tourId, isRunning, start: () => void start() }),
    [tourId, isRunning, start]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};
