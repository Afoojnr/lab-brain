import { getTranslations } from 'next-intl/server';

import { parseProjectTab, ProjectDetail } from '@/features/experiments';
import { getProjectById } from '@/features/experiments/server';
import { deleteProjectAction } from '@/app/(workspace)/_actions/delete-records';
import { SummariseButton } from '@/features/assistant';
import { ReferencesTab } from '@/features/references';
import { listReferencesByProject } from '@/features/references/server';

export const generateMetadata = async (
  props: PageProps<'/projects/[projectId]'>
) => {
  const { projectId } = await props.params;
  const [project, t] = await Promise.all([
    getProjectById(projectId),
    getTranslations('home')
  ]);

  return { title: project?.name ?? t('title') };
};

const ProjectPage = async (props: PageProps<'/projects/[projectId]'>) => {
  const { projectId } = await props.params;
  const { tab } = await props.searchParams;
  const references = await listReferencesByProject(projectId);

  return (
    <ProjectDetail
      projectId={projectId}
      tab={parseProjectTab(tab)}
      referenceCount={references.length}
      deleteProject={deleteProjectAction.bind(null, projectId)}
      references={
        <ReferencesTab
          projectId={projectId}
          renderActions={reference => (
            <SummariseButton
              projectId={projectId}
              referenceId={reference.id}
              hasSummary={reference.summary !== null}
            />
          )}
        />
      }
    />
  );
};

export default ProjectPage;
