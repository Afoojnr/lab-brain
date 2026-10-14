import { getTranslations } from 'next-intl/server';

import { PageTabs } from '@/components/page-tabs';

import type { SectionTab } from '../navigation/sections';

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
    <PageTabs
      label={t('label')}
      active={active}
      tourId="section-tabs"
      tabs={tabs.map(({ tab, count }) => ({
        value: tab,
        label: t(tab),
        count,
        href: `${experimentPath}?tab=${tab}`
      }))}
    />
  );
};
