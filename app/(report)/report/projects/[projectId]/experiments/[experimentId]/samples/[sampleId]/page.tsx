import { SampleReport } from '@/features/reports';

export const metadata = { title: 'Sample report' };

const SampleReportPage = async (
  props: PageProps<'/report/projects/[projectId]/experiments/[experimentId]/samples/[sampleId]'>
) => {
  const { projectId, experimentId, sampleId } = await props.params;

  return (
    <SampleReport
      projectId={projectId}
      experimentId={experimentId}
      sampleId={sampleId}
    />
  );
};

export default SampleReportPage;
