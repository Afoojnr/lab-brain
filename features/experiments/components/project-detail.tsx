import { LayersIcon, UploadIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';

import { listParameterDefinitions } from '../data/parameter-definitions';
import { getProjectById } from '../data/projects';
import { listSamplesByExperiment } from '../data/samples';
import { listExperimentsByProject } from '../data/experiments';
import { EditProjectDialog } from './edit-project-dialog';
import { NewExperimentDialog } from './new-experiment-dialog';
import { ExperimentCard } from './experiment-card';

/** One project: its experiment as cards (like the sheets of a spreadsheet), or an empty state to add the first. */
export const ProjectDetail = async ({ projectId }: { projectId: string }) => {
  const [t, tImport, project] = await Promise.all([
    getTranslations('experiments.project'),
    getTranslations('import.entry'),
    getProjectById(projectId)
  ]);
  if (!project) notFound();

  const experimentList = await listExperimentsByProject(project.id);
  const cards = await Promise.all(
    experimentList.map(async experiment => {
      const [samples, definitions] = await Promise.all([
        listSamplesByExperiment(experiment.id),
        listParameterDefinitions(experiment.id)
      ]);

      return {
        experiment,
        sampleCount: samples.length,
        columnCount: definitions.length
      };
    })
  );
  const otherPrefixes = experimentList.map(experiment => experiment.codePrefix);
  const hasExperiments = cards.length > 0;

  return (
    <FadeIn>
      <PageHeader
        title={project.name}
        description={project.description ?? t('noDescription')}
        breadcrumbs={[
          { label: t('breadcrumbProjects'), href: '/' },
          { label: project.name }
        ]}
        actions={
          <>
            <EditProjectDialog project={project} />
            <Link
              href={`/projects/${project.id}/import`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <UploadIcon aria-hidden />
              {tImport('project')}
            </Link>
            {hasExperiments && (
              <NewExperimentDialog
                projectId={project.id}
                otherPrefixes={otherPrefixes}
              />
            )}
          </>
        }
      />
      <div className="mt-8">
        {hasExperiments ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(card => (
              <li key={card.experiment.id}>
                <ExperimentCard projectId={project.id} {...card} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayersIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{t('empty.title')}</EmptyTitle>
              <EmptyDescription>{t('empty.description')}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-wrap justify-center gap-2">
                <NewExperimentDialog
                  projectId={project.id}
                  otherPrefixes={otherPrefixes}
                />
                <Link
                  href={`/projects/${project.id}/import`}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  {t('empty.import')}
                </Link>
              </div>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </FadeIn>
  );
};
