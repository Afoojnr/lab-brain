import { PlotsWorkspace } from '@/features/plots';

export const metadata = { title: 'Plots' };

const PlotsPage = async (props: PageProps<'/plots'>) => {
  const { source, project, experiment, samples, plot } =
    await props.searchParams;

  return (
    <PlotsWorkspace
      source={source === 'experiment' ? 'experiment' : 'upload'}
      projectId={typeof project === 'string' ? project : undefined}
      experimentId={typeof experiment === 'string' ? experiment : undefined}
      plotId={typeof plot === 'string' ? plot : undefined}
      sampleIds={
        typeof samples === 'string' && samples !== ''
          ? samples.split(',')
          : undefined
      }
    />
  );
};

export default PlotsPage;
