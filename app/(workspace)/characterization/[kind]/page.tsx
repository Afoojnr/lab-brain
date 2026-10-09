import { notFound } from 'next/navigation';

import {
  isTechniqueKind,
  TechniqueWorkspace
} from '@/features/characterization';

// TODO: a descriptive tab title waits for the data layer (Step 6).
export const metadata = { title: 'Characterization' };

const TechniquePage = async (props: PageProps<'/characterization/[kind]'>) => {
  const { kind } = await props.params;
  const { source, project, experiment } = await props.searchParams;
  if (!isTechniqueKind(kind)) notFound();

  return (
    <TechniqueWorkspace
      kind={kind}
      source={source === 'experiment' ? 'experiment' : 'upload'}
      projectId={typeof project === 'string' ? project : undefined}
      experimentId={typeof experiment === 'string' ? experiment : undefined}
    />
  );
};

export default TechniquePage;
