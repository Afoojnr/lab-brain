// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/storage', () => ({ getStorage: vi.fn() }));
vi.mock('./data/datasets', () => ({ getDatasetById: vi.fn() }));
vi.mock('@/lib/images/tiff-preview', () => ({ imageToPng: vi.fn() }));

import { imageToPng } from '@/lib/images/tiff-preview';
import { getStorage } from '@/lib/storage';

import { getDatasetById } from './data/datasets';
import { datasetResponse } from './datasets-file';

const serve = (contentType: string, fileName = 'f.bin') => {
  vi.mocked(getDatasetById).mockResolvedValue({
    id: 'd1',
    fileName,
    storagePath: 'a/f',
    contentType
  } as never);
  vi.mocked(getStorage).mockReturnValue({
    download: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
  } as never);
};

describe('datasetResponse', () => {
  it('shows a common image inline', async () => {
    serve('image/png', 'photo.png');

    const response = await datasetResponse('d1');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Content-Disposition')).toMatch(/^inline/);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('makes every other type a download', async () => {
    serve('application/octet-stream', 'spectrum.spx');

    const response = await datasetResponse('d1');

    expect(response.headers.get('Content-Disposition')).toMatch(/^attachment/);
  });

  it('is a 404 for an unknown record or a missing file', async () => {
    vi.mocked(getDatasetById).mockResolvedValueOnce(undefined);
    expect((await datasetResponse('nope')).status).toBe(404);

    vi.mocked(getDatasetById).mockResolvedValueOnce({
      storagePath: 'gone'
    } as never);
    vi.mocked(getStorage).mockReturnValue({
      download: vi.fn().mockResolvedValue(null)
    } as never);
    expect((await datasetResponse('d1')).status).toBe(404);
  });

  it('serves a TIFF as a download, and as a PNG copy when a preview is asked for', async () => {
    serve('image/tiff', 'Image 1.tiff');
    vi.mocked(imageToPng).mockResolvedValue(new Uint8Array([9, 9]));

    const original = await datasetResponse('d1');
    expect(original.headers.get('Content-Type')).toBe('image/tiff');
    expect(original.headers.get('Content-Disposition')).toMatch(/^attachment/);

    const preview = await datasetResponse('d1', { previewWidth: 320 });
    expect(preview.headers.get('Content-Type')).toBe('image/png');
    expect(preview.headers.get('Content-Disposition')).toBe('inline');
    expect(imageToPng).toHaveBeenCalledWith(expect.any(Uint8Array), 320);
  });

  it('says so when a TIFF cannot be converted', async () => {
    serve('image/tiff', 'broken.tiff');
    vi.mocked(imageToPng).mockResolvedValue(null);

    expect((await datasetResponse('d1', { previewWidth: 320 })).status).toBe(
      422
    );
  });

  it('ignores a preview request for a file that is not a TIFF', async () => {
    serve('text/plain', 'a.txt');

    const response = await datasetResponse('d1', { previewWidth: 320 });

    expect(response.headers.get('Content-Type')).toBe('text/plain');
    expect(imageToPng).not.toHaveBeenCalled();
  });
});
