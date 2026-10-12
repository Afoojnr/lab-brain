import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { cn } from '@/lib/utils';

import type { SectionTab } from '../sections';

type SectionTabsProps = {
  /** `/projects/<id>/experiments/<id>`; each tab links to it with `?tab=`. */
  experimentPath: string;
  active: SectionTab;
  /** Whether the saved plots section exists (it is composed by the page). */
  hasPlots: boolean;
  counts: { samples: number; plots: number };
};

/**
 * The sections of one experiment as an underlined tab bar: Protocol, Setup
 * (columns, calculated columns and studies), Samples (the daily work) and Plots.
 * An experiment opens on its samples, or on Setup while it has none. It switches the view within one experiment, which is why it
 * looks different from the experiment pills above it. The chosen tab is in the
 * URL, so Back and links work, and the bar scrolls sideways on a phone.
 */
export const SectionTabs = async ({
  experimentPath,
  active,
  hasPlots,
  counts
}: SectionTabsProps) => {
  const t = await getTranslations('experiments.sections');
  const tabs: { tab: SectionTab; count?: number }[] = [
    { tab: 'protocol' },
    { tab: 'setup' },
    { tab: 'samples', count: counts.samples },
    ...(hasPlots ? [{ tab: 'plots' as const, count: counts.plots }] : [])
  ];

  return (
    <nav
      aria-label={t('label')}
      className="mt-6 flex gap-1 overflow-x-auto border-b"
    >
      {tabs.map(({ tab, count }) => (
        <Link
          key={tab}
          href={`${experimentPath}?tab=${tab}`}
          aria-current={tab === active ? 'page' : undefined}
          className={cn(
            '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
            tab === active
              ? 'border-primary text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          )}
        >
          {t(tab)}
          {/* A space between the word and the number, so a screen reader says "Samples 23". */}
          {count !== undefined && ' '}
          {count !== undefined && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
};
