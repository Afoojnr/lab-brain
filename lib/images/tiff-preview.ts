import sharp from 'sharp';

/** The longest side of a preview, however large the original. */
export const MAX_PREVIEW_SIDE = 2000;

/**
 * A PNG copy of an image the browser cannot show (TIFF), no larger than
 * `width` pixels on its longest side. The original is never changed.
 *
 * @param bytes - The original file.
 * @param width - Longest side wanted, at most {@link MAX_PREVIEW_SIDE}.
 * @returns The PNG, or null when the file is not an image sharp can read.
 */
export const imageToPng = async (
  bytes: Uint8Array,
  width: number = MAX_PREVIEW_SIDE
): Promise<Uint8Array | null> => {
  const side = Math.min(Math.max(Math.round(width), 16), MAX_PREVIEW_SIDE);

  try {
    return new Uint8Array(
      await sharp(Buffer.from(bytes))
        .rotate()
        .resize({
          width: side,
          height: side,
          fit: 'inside',
          withoutEnlargement: true
        })
        .png()
        .toBuffer()
    );
  } catch {
    return null;
  }
};
