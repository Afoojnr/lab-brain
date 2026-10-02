import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';

import { listProjects } from '../data/projects';
import { NewProjectDialog } from './new-project-dialog';
import { ProjectGrid } from './project-grid';
import { ProjectsEmpty } from './projects-empty';

/** The landing screen: every project as a card, or an empty state to create the first one. */
export const Dashboard = async () => {
  const [t, projects] = await Promise.all([
    getTranslations('dashboard'),
    listProjects()
  ]);
  const hasProjects = projects.length > 0;

  return (
    <FadeIn>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={hasProjects ? <NewProjectDialog /> : undefined}
      />
      <div className="mt-8">
        {hasProjects ? <ProjectGrid projects={projects} /> : <ProjectsEmpty />}
      </div>
    </FadeIn>
  );
};
