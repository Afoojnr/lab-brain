import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';

import { listProjects } from '../data/projects';
import { listExperimentsByProject } from '../data/experiments';
import { NewProjectDialog } from './new-project-dialog';
import { ProjectGrid } from './project-grid';
import { ProjectsEmpty } from './projects-empty';

/**
 * The home page: every project as a card with its experiment count, or, on a
 * first run, a welcome with the way to create the first one. `emptyExtra` is
 * extra content for that welcome (the app puts links to the raw-files
 * workspaces there, because this feature cannot import another).
 */
export const Home = async ({ emptyExtra }: { emptyExtra?: ReactNode }) => {
  const [t, projects] = await Promise.all([
    getTranslations('home'),
    listProjects()
  ]);
  const projectsWithCounts = await Promise.all(
    projects.map(async project => ({
      project,
      experimentCount: (await listExperimentsByProject(project.id)).length
    }))
  );
  const hasProjects = projects.length > 0;

  return (
    <FadeIn>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={hasProjects ? <NewProjectDialog /> : undefined}
      />
      <div className="mt-8">
        {hasProjects ? (
          <ProjectGrid projects={projectsWithCounts} />
        ) : (
          <ProjectsEmpty>{emptyExtra}</ProjectsEmpty>
        )}
      </div>
    </FadeIn>
  );
};
