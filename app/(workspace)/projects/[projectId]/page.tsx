import { parseProjectTab, ProjectDetail } from '@/features/experiments';
import { deleteProjectAction } from '@/app/(workspace)/_actions/delete-records';
import { SummariseButton } from '@/features/assistant';
import { ReferencesTab } from '@/features/references';
import { listReferencesByProject } from '@/features/references/server';

// TODO: show the project's name in the tab title. That needs a server-only
// data read in this file, which waits for the data layer (Step 4).
export const metadata = { title: 'Project' };

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
