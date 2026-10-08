/** How a file can be shown without leaving the page. */
export type ViewerKind = 'image' | 'tiff' | 'csv' | 'sheet' | 'text' | 'other';

/** Larger files are offered as a download only. */
export const MAX_PREVIEW_BYTES = 10 * 1024 * 1024;

const KINDS: Record<string, ViewerKind> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  tif: 'tiff',
  tiff: 'tiff',
  csv: 'csv',
  tsv: 'csv',
  xlsx: 'sheet',
  xls: 'sheet',
  txt: 'text',
  emsa: 'text',
  dat: 'text',
  log: 'text'
};

/**
 * How to show a file, from its extension. Tables and text over
 * {@link MAX_PREVIEW_BYTES} are not previewed; images are always shown.
 *
 * @param fileName - The file's name.
 * @param sizeBytes - The file's size.
 */
export const viewerKind = (fileName: string, sizeBytes: number): ViewerKind => {
  const dot = fileName.lastIndexOf('.');
  const kind =
    (dot === -1 ? undefined : KINDS[fileName.slice(dot + 1).toLowerCase()]) ??
    'other';
  const isImage = kind === 'image' || kind === 'tiff';

  return !isImage && sizeBytes > MAX_PREVIEW_BYTES ? 'other' : kind;
};

/** Whether the viewer shows this kind (everything else is a plain download). */
export const isViewable = (kind: ViewerKind): boolean => kind !== 'other';
