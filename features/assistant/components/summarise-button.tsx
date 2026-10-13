'use client';

import { SparklesIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { summariseReferenceAction } from '../actions/summarise-reference';
import { isAiReady } from '../ai/settings';
import { useAiSettings } from '../hooks/use-ai-settings';

/**
 * Asks the user's AI to write a short summary of a reference. Costs tokens
 * only when pressed; without AI settings it is disabled and says why.
 */
export const SummariseButton = ({
  projectId,
  referenceId,
  hasSummary
}: {
  projectId: string;
  referenceId: string;
  hasSummary: boolean;
}) => {
  const t = useTranslations('assistant.summarise');
  const tErrors = useTranslations('assistant.errors');
  const [settings] = useAiSettings();
  const [isSummarising, startSummarising] = useTransition();
  const isReady = isAiReady(settings);

  const summarise = () =>
    startSummarising(async () => {
      try {
        const result = await summariseReferenceAction(
          projectId,
          referenceId,
          settings
        );
        if (result.ok) toast.success(t('done'));
        else toast.error(tErrors(result.error));
      } catch {
        toast.error(tErrors('failed'));
      }
    });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!isReady || isSummarising}
      title={isReady ? undefined : t('needsSettings')}
      onClick={summarise}
    >
      <SparklesIcon aria-hidden />
      {isSummarising ? t('working') : hasSummary ? t('again') : t('button')}
    </Button>
  );
};
