import { datasetResponse } from '@/features/experiments/server';

export const GET = async (
  request: Request,
  context: RouteContext<'/api/datasets/[datasetId]'>
) => {
  const { datasetId } = await context.params;
  const { searchParams } = new URL(request.url);
  // `?preview=png&w=320`: a PNG copy of a TIFF, for showing it in the page.
  const width = Number(searchParams.get('w'));
  const previewWidth =
    searchParams.get('preview') === 'png'
      ? Number.isFinite(width) && width > 0
        ? width
        : 2000
      : undefined;

  return datasetResponse(datasetId, { previewWidth });
};
