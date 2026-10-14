import { getTranslations } from 'next-intl/server';

import { ImportPage } from '@/features/import';

export const generateMetadata = async () => {
  const t = await getTranslations('import.page');

  return { title: t('title') };
};

const ImportRoutePage = async (
  props: PageProps<'/projects/[projectId]/import'>
) => {
  const { projectId } = await props.params;
  const { experiment } = await props.searchParams;

  return (
    <ImportPage
      projectId={projectId}
      experimentId={typeof experiment === 'string' ? experiment : undefined}
    />
  );
};

export default ImportRoutePage;
