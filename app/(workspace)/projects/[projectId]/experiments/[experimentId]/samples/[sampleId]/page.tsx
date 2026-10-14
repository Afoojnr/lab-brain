import { deleteSampleAction } from '@/app/(workspace)/_actions/delete-records';
import { getTranslations } from 'next-intl/server';

import { SampleDetail } from '@/features/experiments';
import { getSampleById } from '@/features/experiments/server';

export const generateMetadata = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]/samples/[sampleId]'>
) => {
  const { experimentId, sampleId } = await props.params;
  const [sample, t] = await Promise.all([
    getSampleById(sampleId),
    getTranslations('samples.page')
  ]);

  return {
    title:
      sample?.experimentId === experimentId ? sample.code : t('fallbackTitle')
  };
};

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
