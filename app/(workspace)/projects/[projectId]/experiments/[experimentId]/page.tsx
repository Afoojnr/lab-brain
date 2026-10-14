import { getTranslations } from 'next-intl/server';

import { ExperimentDetail, parseSectionTab } from '@/features/experiments';
import { getExperimentInProject } from '@/features/experiments/server';
import { SavedPlotCards } from '@/features/plots';
import { listSavedPlots } from '@/features/plots/server';
import { deleteExperimentAction } from '@/app/(workspace)/_actions/delete-records';

export const generateMetadata = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]'>
) => {
  const { projectId, experimentId } = await props.params;
  const [experiment, t] = await Promise.all([
    getExperimentInProject(projectId, experimentId),
    getTranslations('navigation')
  ]);

  return { title: experiment?.name ?? t('projects') };
};

const ExperimentPage = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]'>
) => {
  const { projectId, experimentId } = await props.params;
  const { study, q, tab } = await props.searchParams;
  const savedPlots = await listSavedPlots(experimentId);

  return (
    <ExperimentDetail
      projectId={projectId}
      experimentId={experimentId}
      studyId={typeof study === 'string' ? study : undefined}
      query={typeof q === 'string' ? q : undefined}
      tab={parseSectionTab(tab)}
      savedPlotCount={savedPlots.length}
      deleteExperiment={deleteExperimentAction.bind(
        null,
        projectId,
        experimentId
      )}
      savedPlots={
        <SavedPlotCards projectId={projectId} experimentId={experimentId} />
      }
    />
  );
};

export default ExperimentPage;
