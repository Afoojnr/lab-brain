import type { ExportPage } from './types';

/** A 16:9 slide, in inches. */
const SLIDE = { width: 13.33, height: 7.5 };
const MARGIN = 0.5;

/**
 * A PowerPoint file with one 16:9 slide per entry: the title, the picture
 * scaled to fit, then the lines of text under it. Loaded on demand.
 *
 * @param pages - The slides, in order. At least one.
 */
export const buildPptx = async (pages: ExportPage[]): Promise<Uint8Array> => {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const presentation = new PptxGenJS();
  presentation.layout = 'LAYOUT_WIDE';

  for (const page of pages) {
    const slide = presentation.addSlide();
    const contentWidth = SLIDE.width - 2 * MARGIN;
    slide.addText(page.title, {
      x: MARGIN,
      y: 0.3,
      w: contentWidth,
      h: 0.7,
      fontSize: 24,
      bold: true,
      color: '141414',
      fontFace: 'Arial'
    });

    const textHeight =
      page.lines.length > 0 ? 0.28 * page.lines.length + 0.1 : 0;
    if (page.image) {
      const top = 1.1;
      const room = SLIDE.height - top - MARGIN - textHeight;
      const fit = Math.min(
        contentWidth / page.image.width,
        room / page.image.height
      );
      const width = page.image.width * fit;
      const height = page.image.height * fit;
      slide.addImage({
        data: page.image.dataUrl,
        x: MARGIN + (contentWidth - width) / 2,
        y: top,
        w: width,
        h: height
      });
    }

    if (page.lines.length > 0) {
      slide.addText(page.lines.join('\n'), {
        x: MARGIN,
        y: SLIDE.height - MARGIN - textHeight,
        w: contentWidth,
        h: textHeight,
        fontSize: 12,
        color: '505050',
        fontFace: 'Arial',
        valign: 'top'
      });
    }
  }

  return (await presentation.write({ outputType: 'uint8array' })) as Uint8Array;
};
