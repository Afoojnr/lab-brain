import { DownloadIcon, LayersIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Markdown } from '@/components/markdown';
import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';
import { PageTabs } from '@/components/page-tabs';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';

import { countProject } from '../cascade/count-records';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { getProjectById } from '../data/projects';
import { listSamplesByExperiment } from '../data/samples';
import { listExperimentsByProject } from '../data/experiments';
import { DEFAULT_PROJECT_TAB } from '../navigation/project-tabs';
import type { ProjectTab } from '../navigation/project-tabs';
import { EditBackgroundDialog } from './edit-background-dialog';
import { ProjectMenu } from './project-menu';
import { NewExperimentDialog } from './new-experiment-dialog';
import { ExperimentCard } from './experiment-card';

type ProjectDetailProps = {
  projectId: string;
  /** Which section is shown, from the URL (`?tab=`). */
  tab?: ProjectTab;
  /** The references section, composed by the page (this feature cannot import the references feature). */
  references?: ReactNode;
  /** How many references there are, for the tab's count. */
  referenceCount?: number;
  /** Deletes the project (and what is in it); composed by the page, since other features hold data about it. */
  deleteProject?: (typedName: string) => Promise<boolean>;
};

/**
 * One project in three tabs: its background (formatted text the AI assistant
 * reads), its experiments as cards (like the sheets of a spreadsheet, or an
 * empty state to add the first), and its references.
 */
export const ProjectDetail = async ({
  projectId,
  tab = DEFAULT_PROJECT_TAB,
  references,
  referenceCount = 0,
  deleteProject
}: ProjectDetailProps) => {
  const [t, tImport, tTabs, tBackground, project] = await Promise.all([
    getTranslations('experiments.project'),
    getTranslations('import.entry'),
    getTranslations('projects.tabs'),
    getTranslations('projects.background'),
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
  const activeTab =
    tab === 'references' && !references ? DEFAULT_PROJECT_TAB : tab;

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
            <Link
              href={`/projects/${project.id}/import`}
              data-tour="import"
              className={buttonVariants({ variant: 'outline' })}
            >
              <DownloadIcon aria-hidden />
              {tImport('project')}
            </Link>
            {hasExperiments && (
              <NewExperimentDialog
                projectId={project.id}
                otherPrefixes={otherPrefixes}
              />
            )}
            <ProjectMenu
              project={project}
              details={
                deleteProject
                  ? {
                      kind: 'project',
                      counts: {
                        ...(await countProject(project.id)),
                        references: referenceCount
                      },
                      hasSavedData: true,
                      hasBackground: Boolean(project.background),
                      confirmName: project.name,
                      onDelete: deleteProject,
                      afterHref: '/'
                    }
                  : undefined
              }
            />
          </>
        }
      />
      <PageTabs
        label={tTabs('label')}
        active={activeTab}
        tourId="project-tabs"
        tabs={[
          {
            value: 'background',
            label: tTabs('background'),
            href: `/projects/${project.id}?tab=background`
          },
          {
            value: 'experiments',
            label: tTabs('experiments'),
            count: experimentList.length,
            href: `/projects/${project.id}`
          },
          ...(references
            ? [
                {
                  value: 'references',
                  label: tTabs('references'),
                  count: referenceCount,
                  href: `/projects/${project.id}?tab=references`
                }
              ]
            : [])
        ]}
      />
      {activeTab === 'background' && (
        <section className="mt-6 grid max-w-3xl gap-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              {tBackground('hint')}
            </p>
            <EditBackgroundDialog
              projectId={project.id}
              background={project.background}
            />
          </div>
          {project.background ? (
            <div className="text-sm">
              <Markdown>{project.background}</Markdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {tBackground('empty')}
            </p>
          )}
        </section>
      )}
      {activeTab === 'references' && references && (
        <div className="mt-6">{references}</div>
      )}
      {activeTab === 'experiments' && (
        <div className="mt-6">
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
      )}
    </FadeIn>
  );
};
