import { NewSample } from '@/features/experiments';

// TODO: a descriptive tab title waits for the data layer (Step 6).
export const metadata = { title: 'Add sample' };

const NewSamplePage = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]/samples/new'>
) => {
  const { projectId, experimentId } = await props.params;
  const { duplicateOf } = await props.searchParams;

  return (
    <NewSample
      projectId={projectId}
      experimentId={experimentId}
      duplicateOfId={typeof duplicateOf === 'string' ? duplicateOf : undefined}
    />
  );
};

export default NewSamplePage;
