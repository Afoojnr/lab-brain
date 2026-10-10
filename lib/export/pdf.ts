import type { ExportPage } from './types';

const MARGIN = 36;

/**
 * A PDF with one landscape A4 page per entry: the title, the picture scaled to
 * fit, then the lines of text under it. Loaded on demand, so the PDF library
 * is only downloaded when someone exports.
 *
 * @param pages - The pages, in order. At least one.
 */
export const buildPdf = async (pages: ExportPage[]): Promise<Uint8Array> => {
  const { jsPDF } = await import('jspdf');
  const document = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 2 * MARGIN;

  for (const [index, page] of pages.entries()) {
    if (index > 0) document.addPage();

    let y = MARGIN;
    document.setFont('helvetica', 'bold').setFontSize(18).setTextColor(20);
    const title = document.splitTextToSize(
      page.title,
      contentWidth
    ) as string[];
    document.text(title, MARGIN, y + 14);
    y += title.length * 22 + 8;

    document.setFont('helvetica', 'normal').setFontSize(10).setTextColor(80);
    const lines = page.lines.flatMap(
      line => document.splitTextToSize(line, contentWidth) as string[]
    );
    const textHeight = lines.length * 13;

    if (page.image) {
      const room = pageHeight - y - MARGIN - textHeight - 8;
      const fit = Math.min(
        contentWidth / page.image.width,
        room / page.image.height
      );
      const width = page.image.width * fit;
      const height = page.image.height * fit;
      document.addImage(
        page.image.dataUrl,
        'PNG',
        MARGIN + (contentWidth - width) / 2,
        y,
        width,
        height,
        undefined,
        'FAST'
      );
      y += height + 8;
    }

    for (const line of lines) {
      y += 13;
      document.text(line, MARGIN, y);
    }
  }

  return new Uint8Array(document.output('arraybuffer'));
};
