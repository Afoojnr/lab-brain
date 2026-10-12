import { ExperimentSummary } from '@/features/reports';

export const metadata = { title: 'Experiment summary' };

const ExperimentSummaryPage = async (
  props: PageProps<'/report/projects/[projectId]/experiments/[experimentId]'>
) => {
  const { projectId, experimentId } = await props.params;

  return (
    <ExperimentSummary projectId={projectId} experimentId={experimentId} />
  );
};

export default ExperimentSummaryPage;
