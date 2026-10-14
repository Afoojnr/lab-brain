import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page/page-header';

import { listProjects } from '../data/projects';
import { listExperimentsByProject } from '../data/experiments';
import { NewProjectDialog } from './new-project-dialog';
import { ProjectGrid } from './project-grid';
import { ProjectsEmpty } from './projects-empty';

/**
 * The home page: a card per project, or a welcome on first run. `emptyActions`
 * sits next to the create button and `emptyExtra` under the welcome (the app
 * puts the raw-files links there, as this feature cannot import another).
 */
export const Home = async ({
  emptyActions,
  emptyExtra
}: {
  emptyActions?: ReactNode;
  emptyExtra?: ReactNode;
}) => {
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
      {hasProjects ? (
        <>
          <PageHeader
            title={t('title')}
            description={t('description')}
            actions={<NewProjectDialog />}
          />
          <div className="mt-8">
            <ProjectGrid projects={projectsWithCounts} />
          </div>
        </>
      ) : (
        <ProjectsEmpty actions={emptyActions}>{emptyExtra}</ProjectsEmpty>
      )}
    </FadeIn>
  );
};
