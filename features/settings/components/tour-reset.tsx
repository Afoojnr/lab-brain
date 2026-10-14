'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useTourState } from '@/hooks/use-tour-state';

/** Brings the guided tours back after they were seen or turned off. */
export const TourReset = () => {
  const t = useTranslations('tour.settings');
  const { reset } = useTourState();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        reset();
        toast.success(t('done'));
      }}
    >
      {t('reset')}
    </Button>
  );
};
