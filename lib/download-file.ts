/**
 * Offers bytes to the user as a file download, in the browser.
 *
 * @param fileName - The name the file gets.
 * @param bytes - The file's contents.
 * @param type - Its media type.
 */
export const downloadBytes = (
  fileName: string,
  bytes: Uint8Array,
  type: string
) => {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const XLSX_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const CSV_TYPE = 'text/csv;charset=utf-8';
export const PNG_TYPE = 'image/png';
export const PDF_TYPE = 'application/pdf';
export const PPTX_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/**
 * A file name from a title: lower case, letters and digits joined by dashes
 * (accents removed). A title with no letters or digits gets the fallback name.
 *
 * @param title - What the file is about, e.g. a plot title or an experiment name.
 * @param extension - The extension without the dot.
 * @param fallback - Used when the title leaves nothing.
 */
export const fileNameFor = (
  title: string,
  extension: string,
  fallback = 'plot'
) => {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return `${slug === '' ? fallback : slug}.${extension}`;
};
