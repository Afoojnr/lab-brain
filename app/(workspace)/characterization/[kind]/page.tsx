import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  isTechniqueKind,
  TechniqueWorkspace
} from '@/features/characterization';

export const generateMetadata = async (
  props: PageProps<'/characterization/[kind]'>
) => {
  const { kind } = await props.params;
  const t = await getTranslations('navigation');

  return {
    title: isTechniqueKind(kind) ? t(kind) : t('characterizations')
  };
};

const TechniquePage = async (props: PageProps<'/characterization/[kind]'>) => {
  const { kind } = await props.params;
  const { source, project, experiment } = await props.searchParams;
  if (!isTechniqueKind(kind)) notFound();

  return (
    <TechniqueWorkspace
      kind={kind}
      source={source === 'experiment' || source === 'bonds' ? source : 'upload'}
      projectId={typeof project === 'string' ? project : undefined}
      experimentId={typeof experiment === 'string' ? experiment : undefined}
    />
  );
};

export default TechniquePage;
