import { ExperimentDetail } from '@/features/experiments';
import { SavedPlotCards } from '@/features/plots';

// TODO: a descriptive tab title waits for the data layer (Step 6).
export const metadata = { title: 'Experiment' };

const ExperimentPage = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]'>
) => {
  const { projectId, experimentId } = await props.params;
  const { study, q } = await props.searchParams;

  return (
    <ExperimentDetail
      projectId={projectId}
      experimentId={experimentId}
      studyId={typeof study === 'string' ? study : undefined}
      savedPlots={
        <SavedPlotCards projectId={projectId} experimentId={experimentId} />
      }
      query={typeof q === 'string' ? q : undefined}
    />
  );
};

export default ExperimentPage;
