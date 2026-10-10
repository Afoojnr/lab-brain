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
