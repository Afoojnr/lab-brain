import { getTranslations } from 'next-intl/server';

import { EditSample } from '@/features/experiments';
import { getSampleById } from '@/features/experiments/server';

export const generateMetadata = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]/samples/[sampleId]/edit'>
) => {
  const { experimentId, sampleId } = await props.params;
  const [sample, t] = await Promise.all([
    getSampleById(sampleId),
    getTranslations('samples.edit')
  ]);
  const code = sample?.experimentId === experimentId ? sample.code : '';

  return { title: t('title', { code }).trim() };
};

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
