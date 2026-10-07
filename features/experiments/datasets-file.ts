import { getStorage } from '@/lib/storage';

import { getDatasetById } from './data/datasets';
import { isInlineImage } from './datasets';

/**
 * The response for one attached file. Common images are shown inline; every
 * other type is a download, and nothing is ever served as a type the browser
 * could run.
 *
 * @param datasetId - The file record's id.
 * @returns The file, or a 404 when there is no such record or file.
 */
export const datasetResponse = async (datasetId: string): Promise<Response> => {
  const dataset = await getDatasetById(datasetId);
  const bytes = dataset
    ? await getStorage().download(dataset.storagePath)
    : null;
  if (!dataset || !bytes) return new Response('Not found', { status: 404 });

  const disposition = isInlineImage(dataset.contentType)
    ? 'inline'
    : 'attachment';

  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': dataset.contentType,
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(dataset.fileName)}`,
      'Content-Length': String(bytes.byteLength),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache'
    }
  });
};
