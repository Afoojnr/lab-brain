import { datasetResponse } from '@/features/experiments/server';

export const GET = async (
  _request: Request,
  context: RouteContext<'/api/datasets/[datasetId]'>
) => {
  const { datasetId } = await context.params;

  return datasetResponse(datasetId);
};
