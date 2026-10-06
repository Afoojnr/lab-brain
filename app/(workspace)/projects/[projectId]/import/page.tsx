import { ImportPage } from '@/features/import';

// TODO: a descriptive tab title waits for the data layer (Step 6).
export const metadata = { title: 'Import' };

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
