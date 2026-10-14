import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page/page-header';
import { buttonVariants } from '@/components/ui/button';

import { listBonds } from '../data/ftir-bonds';
import type { AnalysisKind } from '../types';
import { ExperimentSource } from './experiment-source';
import { FtirBondsTab } from './ftir-bonds-tab';
import { UploadEdx } from './upload-edx';
import { UploadEllipsometry } from './upload-ellipsometry';
import { UploadFtir } from './upload-ftir';

/** `bonds` (the user's bond table) exists for FTIR only. */
export type WorkspaceSource = 'upload' | 'experiment' | 'bonds';

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
  const tabs =
    kind === 'ftir'
      ? (['upload', 'experiment', 'bonds'] as const)
      : (['upload', 'experiment'] as const);
  // A link to the bond table of another technique falls back to the upload.
  const current = source === 'bonds' && kind !== 'ftir' ? 'upload' : source;

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
        {tabs.map(tab => (
          <Link
            key={tab}
            href={`/characterization/${kind}?source=${tab}`}
            aria-current={current === tab ? 'page' : undefined}
            className={buttonVariants({
              variant: current === tab ? 'default' : 'outline'
            })}
          >
            {t(`tabs.${tab}`)}
          </Link>
        ))}
      </nav>
      <div className="mt-6 min-w-0 rounded-xl border p-4 sm:p-6">
        {current === 'upload' ? (
          {
            edx: <UploadEdx />,
            ellipsometry: <UploadEllipsometry />,
            ftir: <UploadFtir bonds={await listBonds()} />
          }[kind]
        ) : current === 'bonds' ? (
          <FtirBondsTab />
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
