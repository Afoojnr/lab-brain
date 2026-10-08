import { imageToPng } from '@/lib/images/tiff-preview';
import { getStorage } from '@/lib/storage';

import { getDatasetById } from './data/datasets';
import { isInlineImage, isTiff } from './datasets';
import type { Dataset } from './types';

/**
 * A stored file's record and bytes, for reading it on the server (an analysis
 * parsing an export). Never changes the file.
 *
 * @param datasetId - The file record's id.
 * @returns The record and bytes, or null when there is no such record or file.
 */
export const datasetBytes = async (
  datasetId: string
): Promise<{ dataset: Dataset; bytes: Uint8Array } | null> => {
  const dataset = await getDatasetById(datasetId);
  const bytes = dataset
    ? await getStorage().download(dataset.storagePath)
    : null;

  return dataset && bytes ? { dataset, bytes } : null;
};

/**
 * The response for one attached file. Common images are shown inline; every
 * other type is a download, and nothing is ever served as a type the browser
 * could run.
 *
 * @param datasetId - The file record's id.
 * @param options - `previewWidth`: for a TIFF, a PNG copy no wider than this
 *   (the original stays untouched for download).
 * @returns The file, or a 404 when there is no such record or file.
 */
export const datasetResponse = async (
  datasetId: string,
  options: { previewWidth?: number } = {}
): Promise<Response> => {
  const dataset = await getDatasetById(datasetId);
  const bytes = dataset
    ? await getStorage().download(dataset.storagePath)
    : null;
  if (!dataset || !bytes) return new Response('Not found', { status: 404 });

  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-cache'
  };

  // A PNG copy of a TIFF, for showing it in the page.
  if (options.previewWidth !== undefined && isTiff(dataset.contentType)) {
    const png = await imageToPng(bytes, options.previewWidth);
    if (!png) return new Response('Preview unavailable', { status: 422 });

    return new Response(Buffer.from(png), {
      headers: {
        ...headers,
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline',
        'Content-Length': String(png.byteLength)
      }
    });
  }

  const disposition = isInlineImage(dataset.contentType)
    ? 'inline'
    : 'attachment';

  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': dataset.contentType,
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(dataset.fileName)}`,
      'Content-Length': String(bytes.byteLength),
      ...headers
    }
  });
};
