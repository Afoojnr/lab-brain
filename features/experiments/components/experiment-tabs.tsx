import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { cn } from '@/lib/utils';

import type { Experiment } from '../types';

/**
 * The project's experiments as tabs, like the sheets of a spreadsheet, so moving
 * between ALD, PSL and the rest is one click from any experiment page.
 */
export const ExperimentTabs = async ({
  projectId,
  experiments,
  currentExperimentId
}: {
  projectId: string;
  experiments: Experiment[];
  currentExperimentId: string;
}) => {
  const t = await getTranslations('experiments.tabs');

  return (
    <nav aria-label={t('label')} className="mb-6 flex flex-wrap gap-1">
      {experiments.map(item => {
        const isCurrent = item.id === currentExperimentId;

        return (
          <Link
            key={item.id}
            href={`/projects/${projectId}/experiments/${item.id}`}
            aria-current={isCurrent ? 'page' : undefined}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm transition-colors',
              isCurrent
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <span className="font-mono">{item.codePrefix}</span> {item.name}
          </Link>
        );
      })}
    </nav>
  );
};
