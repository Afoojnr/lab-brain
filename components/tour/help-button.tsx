'use client';

import { CircleHelpIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { useTour } from './tour-provider';

/** A ? in the top bar that replays the tour of the page being shown. Hidden where there is none. */
export const TourHelpButton = () => {
  const t = useTranslations('tour.help');
  const { tourId, start } = useTour();

  if (!tourId) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t('label')}
      title={t('label')}
      data-tour="help-button"
      onClick={start}
    >
      <CircleHelpIcon aria-hidden />
    </Button>
  );
};
