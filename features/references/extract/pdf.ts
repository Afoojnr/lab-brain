import { extractText, getDocumentProxy, getMeta } from 'unpdf';

import { MAX_PDF_PAGES } from '../config/limits';

export type PdfExtraction = {
  /** The text of each page, in order. */
  pages: string[];
  title: string | null;
  authors: string | null;
};

/** Why a PDF cannot be added; each is a key the app translates. */
export type PdfRefusalReason = 'unreadable' | 'tooManyPages' | 'noText';

export class PdfRefusal extends Error {
  constructor(readonly reason: PdfRefusalReason) {
    super(reason);
  }
}

/** A PDF of scanned pictures has no text to read; a few stray characters do not count. */
const MIN_TEXT_CHARS = 40;

const clean = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

/**
 * Reads the text of a PDF once, page by page, with its title and authors when
 * the file has them.
 */
export const extractPdf = async (bytes: Uint8Array): Promise<PdfExtraction> => {
  try {
    // PDF.js may take over the buffer it is given, so it gets its own copy.
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    if (pdf.numPages > MAX_PDF_PAGES) throw new PdfRefusal('tooManyPages');

    const { text } = await extractText(pdf, { mergePages: false });
    const pages = text.map(page => page.trim());
    if (pages.join('').length < MIN_TEXT_CHARS) throw new PdfRefusal('noText');

    const meta = await getMeta(pdf).catch(() => null);
    const info = (meta?.info ?? {}) as Record<string, unknown>;

    return { pages, title: clean(info.Title), authors: clean(info.Author) };
  } catch (error) {
    if (error instanceof PdfRefusal) throw error;
    throw new PdfRefusal('unreadable');
  }
};
