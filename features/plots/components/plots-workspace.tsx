import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';

import { ExperimentSource } from './experiment-source';
import { UploadTable } from './upload-table';

export type PlotsSource = 'upload' | 'experiment';

type PlotsWorkspaceProps = {
  source: PlotsSource;
  /** From the URL, for the experiment source. */
  projectId?: string;
  experimentId?: string;
  sampleIds?: string[];
  plotId?: string;
};

/**
 * The plots workspace, opened from the sidebar: plot a table that is not in any
 * experiment (upload), or the samples of an experiment.
 */
export const PlotsWorkspace = async ({
  source,
  projectId,
  experimentId,
  sampleIds,
  plotId
}: PlotsWorkspaceProps) => {
  const t = await getTranslations('plots');

  return (
    <FadeIn>
      <PageHeader title={t('title')} description={t('description')} />
      <nav aria-label={t('title')} className="mt-6 flex flex-wrap gap-2">
        {(['upload', 'experiment'] as const).map(tab => (
          <Link
            key={tab}
            href={`/plots?source=${tab}`}
            aria-current={source === tab ? 'page' : undefined}
            className={buttonVariants({
              variant: source === tab ? 'default' : 'outline'
            })}
          >
            {t(`tabs.${tab}`)}
          </Link>
        ))}
      </nav>
      <div className="mt-6 min-w-0 rounded-xl border p-4 sm:p-6">
        {source === 'upload' ? (
          <UploadTable />
        ) : (
          <ExperimentSource
            projectId={projectId}
            experimentId={experimentId}
            sampleIds={sampleIds}
            plotId={plotId}
          />
        )}
      </div>
    </FadeIn>
  );
};
