'use client';

import { SparklesIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useSidePanel } from '@/components/side-panel/side-panel';
import { Button } from '@/components/ui/button';

/** The floating "Ask AI" button that opens the assistant panel. */
export const AskAiFloating = () => {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { isOpen, open } = useSidePanel();

  if (isOpen || !pathname.startsWith('/projects/')) return null;

  return (
    <Button
      type="button"
      onClick={open}
      aria-label={t('askAi')}
      data-tour="ask-ai"
      className="fixed right-6 bottom-20 z-40 h-11 rounded-full bg-violet-600 px-4 text-white shadow-lg hover:bg-violet-700 focus-visible:ring-violet-500/40 max-sm:w-11 max-sm:px-0"
    >
      <SparklesIcon aria-hidden className="size-5" />
      <span className="max-sm:sr-only">{t('askAi')}</span>
    </Button>
  );
};
