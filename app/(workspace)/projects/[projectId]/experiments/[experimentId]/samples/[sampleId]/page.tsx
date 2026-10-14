import { deleteSampleAction } from '@/app/(workspace)/_actions/delete-records';
import { SampleDetail } from '@/features/experiments';

// TODO: show the sample's code in the tab title once the data layer allows it (Step 6).
export const metadata = { title: 'Sample' };

const SamplePage = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]/samples/[sampleId]'>
) => {
  const { projectId, experimentId, sampleId } = await props.params;

  return (
    <SampleDetail
      projectId={projectId}
      experimentId={experimentId}
      sampleId={sampleId}
      deleteSample={deleteSampleAction.bind(
        null,
        projectId,
        experimentId,
        sampleId
      )}
    />
  );
};

export default SamplePage;
