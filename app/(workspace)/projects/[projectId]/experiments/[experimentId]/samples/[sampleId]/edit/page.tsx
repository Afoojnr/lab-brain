import { EditSample } from '@/features/experiments';

// TODO: a descriptive tab title waits for the data layer (Step 6).
export const metadata = { title: 'Edit sample' };

const EditSamplePage = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]/samples/[sampleId]/edit'>
) => {
  const { projectId, experimentId, sampleId } = await props.params;

  return (
    <EditSample
      projectId={projectId}
      experimentId={experimentId}
      sampleId={sampleId}
    />
  );
};

export default EditSamplePage;
