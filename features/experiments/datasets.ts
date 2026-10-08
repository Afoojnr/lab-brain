/** The largest single file that can be attached. */
export const MAX_DATASET_BYTES = 50 * 1024 * 1024;

const INLINE_IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp'
};

const OTHER_TYPES: Record<string, string> = {
  tif: 'image/tiff',
  tiff: 'image/tiff',
  txt: 'text/plain',
  csv: 'text/csv'
};

const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
};

/**
 * The content type of a file from its extension, never from what the browser
 * claimed. Only common images can be shown inline; everything else is a plain
 * download.
 *
 * @param fileName - The file's name.
 */
export const contentTypeFor = (fileName: string): string => {
  const extension = extensionOf(fileName);
  return (
    INLINE_IMAGE_TYPES[extension] ??
    OTHER_TYPES[extension] ??
    'application/octet-stream'
  );
};

/**
 * Whether a browser can show this content type inline as an image.
 *
 * @param contentType - A type from {@link contentTypeFor}.
 */
export const isInlineImage = (contentType: string): boolean =>
  Object.values(INLINE_IMAGE_TYPES).includes(contentType);

/**
 * Whether this is a TIFF: browsers cannot show it, so the app serves a PNG
 * copy for display and keeps the original for download.
 *
 * @param contentType - A type from {@link contentTypeFor}.
 */
export const isTiff = (contentType: string): boolean =>
  contentType === 'image/tiff';

/**
 * A file size for people: "3 KB", "1.4 MB".
 *
 * @param bytes - The size in bytes.
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
