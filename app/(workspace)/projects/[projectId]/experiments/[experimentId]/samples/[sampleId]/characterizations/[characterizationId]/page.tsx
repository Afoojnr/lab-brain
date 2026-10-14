import { getTranslations } from 'next-intl/server';

import { CharacterizationPage } from '@/features/characterization';
import { getCharacterizationOfSample } from '@/features/experiments/server';

export const generateMetadata = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]/samples/[sampleId]/characterizations/[characterizationId]'>
) => {
  const { sampleId, characterizationId } = await props.params;
  const [record, t] = await Promise.all([
    getCharacterizationOfSample(sampleId, characterizationId),
    getTranslations('navigation')
  ]);

  return { title: record?.technique ?? t('characterizations') };
};

const CharacterizationRoutePage = async (
  props: PageProps<'/projects/[projectId]/experiments/[experimentId]/samples/[sampleId]/characterizations/[characterizationId]'>
) => {
  const { projectId, experimentId, sampleId, characterizationId } =
    await props.params;
  const { analysis } = await props.searchParams;

  return (
    <CharacterizationPage
      projectId={projectId}
      experimentId={experimentId}
      sampleId={sampleId}
      characterizationId={characterizationId}
      analysis={typeof analysis === 'string' ? analysis : undefined}
    />
  );
};

export default CharacterizationRoutePage;
