import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';

import { listProjects } from '../data/projects';
import { listExperimentsByProject } from '../data/experiments';
import { NewProjectDialog } from './new-project-dialog';
import { ProjectGrid } from './project-grid';
import { ProjectsEmpty } from './projects-empty';

/** The landing screen: every project as a card with its experiment count, or an empty state to create the first one. */
export const Dashboard = async () => {
  const [t, projects] = await Promise.all([
    getTranslations('dashboard'),
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
          <ProjectsEmpty />
        )}
      </div>
    </FadeIn>
  );
};
