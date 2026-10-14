'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';

import { PREVIEW_SIZE } from '../style/preview-size';

/**
 * The chart library is only downloaded after the page is up, so a page that
 * shows saved-plot previews (the experiment page) is interactive as soon as it
 * would be without them.
 */
export const LazySavedPlotFigure = dynamic(
  () => import('./saved-plot-figure').then(module => module.SavedPlotFigure),
  {
    ssr: false,
    loading: () => (
      <Skeleton
        style={{ width: PREVIEW_SIZE.width, height: PREVIEW_SIZE.height }}
      />
    )
  }
);
