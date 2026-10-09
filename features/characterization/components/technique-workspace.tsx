import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';

import type { AnalysisKind } from '../types';
import { ExperimentSource } from './experiment-source';
import { UploadEdx } from './upload-edx';
import { UploadEllipsometry } from './upload-ellipsometry';

export type WorkspaceSource = 'upload' | 'experiment';

type TechniqueWorkspaceProps = {
  kind: AnalysisKind;
  source: WorkspaceSource;
  /** From the URL, for the experiment source. */
  projectId?: string;
  experimentId?: string;
};

/**
 * A technique's workspace, opened from the sidebar: analyse raw files that are
 * not in any experiment (upload), or the samples of an experiment.
 */
export const TechniqueWorkspace = async ({
  kind,
  source,
  projectId,
  experimentId
}: TechniqueWorkspaceProps) => {
  const [t, tNavigation] = await Promise.all([
    getTranslations('analysis.workspace'),
    getTranslations('navigation')
  ]);

  return (
    <FadeIn>
      <PageHeader
        title={tNavigation(kind)}
        description={t('description')}
        breadcrumbs={[
          {
            label: tNavigation('characterizations'),
            href: `/characterization/${kind}`
          },
          { label: tNavigation(kind) }
        ]}
      />
      <nav aria-label={tNavigation(kind)} className="mt-6 flex gap-2">
        {(['upload', 'experiment'] as const).map(tab => (
          <Link
            key={tab}
            href={`/characterization/${kind}?source=${tab}`}
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
          kind === 'edx' ? (
            <UploadEdx />
          ) : (
            <UploadEllipsometry />
          )
        ) : (
          <ExperimentSource
            kind={kind}
            projectId={projectId}
            experimentId={experimentId}
          />
        )}
      </div>
    </FadeIn>
  );
};
