// @vitest-environment node
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { imageToPng, MAX_PREVIEW_SIDE } from './tiff-preview';

const tiff = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#336699' } })
    .tiff()
    .toBuffer()
    .then(buffer => new Uint8Array(buffer));

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

describe('imageToPng', () => {
  it('turns a TIFF into a PNG', async () => {
    const png = await imageToPng(await tiff(40, 20));

    expect([...(png ?? []).slice(0, 4)]).toEqual(PNG_SIGNATURE);
    const meta = await sharp(Buffer.from(png ?? [])).metadata();
    expect([meta.width, meta.height]).toEqual([40, 20]);
  });

  it('shrinks to the wanted size and never enlarges', async () => {
    const small = await imageToPng(await tiff(400, 200), 100);
    expect((await sharp(Buffer.from(small ?? [])).metadata()).width).toBe(100);

    const kept = await imageToPng(await tiff(40, 20), 1000);
    expect((await sharp(Buffer.from(kept ?? [])).metadata()).width).toBe(40);
  });

  it('caps the size however much is asked for', async () => {
    const png = await imageToPng(await tiff(3000, 1000), 99999);

    expect((await sharp(Buffer.from(png ?? [])).metadata()).width).toBe(
      MAX_PREVIEW_SIDE
    );
  });

  it('returns null for bytes that are not an image', async () => {
    expect(
      await imageToPng(new TextEncoder().encode('not an image'))
    ).toBeNull();
  });
});
