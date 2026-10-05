import { ProjectDetail } from '@/features/experiments';

// TODO: show the project's name in the tab title. That needs a server-only
// data read in this file, which waits for the data layer (Step 4).
export const metadata = { title: 'Project' };

const ProjectPage = async (props: PageProps<'/projects/[projectId]'>) => {
  const { projectId } = await props.params;

  return <ProjectDetail projectId={projectId} />;
};

export default ProjectPage;
