import type { ExportImage } from './types';

/**
 * Draws an SVG into a PNG, in the browser. The SVG must be self-contained: no
 * CSS variables or external files, because nothing outside it is loaded.
 *
 * @param svg - The SVG markup.
 * @param width - Its width in CSS pixels.
 * @param height - Its height in CSS pixels.
 * @param scale - Pixels per CSS pixel; 3 keeps small text sharp in print.
 */
export const svgToPng = async (
  svg: string,
  width: number,
  height: number,
  scale = 3
): Promise<ExportImage> => {
  const image = new Image();
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('The SVG could not be drawn.'));
    image.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No canvas is available.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return { dataUrl: canvas.toDataURL('image/png'), width, height };
};
