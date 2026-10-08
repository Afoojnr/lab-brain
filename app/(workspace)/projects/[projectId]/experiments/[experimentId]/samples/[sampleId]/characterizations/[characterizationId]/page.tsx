import { CharacterizationPage } from '@/features/characterization';

// TODO: a descriptive tab title waits for the data layer (Step 6).
export const metadata = { title: 'Characterization' };

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
