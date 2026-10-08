'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { applyAnalysisAction } from '../actions/apply-analysis';
import { saveAnalysisSettingsAction } from '../actions/save-analysis-settings';
import type { AnalysisKind, AnalysisSettings } from '../types';

export type AnalysisIds = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterizationId: string;
};

/** Saving an analysis's choices, and sending its values to the result columns, with translated toasts. */
export const useAnalysisRun = (
  ids: AnalysisIds,
  kind: AnalysisKind,
  settings: AnalysisSettings
) => {
  const t = useTranslations('analysis.results');
  const tErrors = useTranslations('errors');
  const [isBusy, startTransition] = useTransition();

  // `targets`: where the chosen values go, as the panel shows them (the defaults
  // the user never touched are in no state, so they are passed here).
  const run = (
    action: 'save' | 'apply',
    targets: AnalysisSettings['targets']
  ) =>
    startTransition(async () => {
      try {
        const args = [
          ids.projectId,
          ids.experimentId,
          ids.sampleId,
          ids.characterizationId,
          kind,
          { ...settings, targets: { ...settings.targets, ...targets } }
        ] as const;

        if (action === 'save') {
          const isSaved = await saveAnalysisSettingsAction(...args);
          if (isSaved) toast.success(t('saved'));
          else toast.error(tErrors('unexpected'));
          return;
        }

        const count = await applyAnalysisAction(...args);
        if (count === null) toast.error(t('failed'));
        else toast.success(t('applied', { count }));
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return {
    isBusy,
    save: (targets: AnalysisSettings['targets']) => run('save', targets),
    apply: (targets: AnalysisSettings['targets']) => run('apply', targets)
  };
};
