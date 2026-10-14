import { getTranslations } from 'next-intl/server';

import { NewSample } from '@/features/experiments';

export const generateMetadata = async () => {
  const t = await getTranslations('samples.new');

  return { title: t('title') };
};

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
