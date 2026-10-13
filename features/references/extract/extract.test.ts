import { jsPDF } from 'jspdf';
import { describe, expect, it } from 'vitest';

import { MAX_TEXT_CHARS } from '../config/limits';
import { extractReadable } from './html';
import { extractPdf, PdfRefusal } from './pdf';
import { buildStoredText, readSlice } from './stored-text';

const makePdf = (pages: string[], title?: string): Uint8Array => {
  const document = new jsPDF();
  if (title) document.setProperties({ title, author: 'Ada Lovelace' });
  pages.forEach((text, index) => {
    if (index > 0) document.addPage();
    document.text(text, 10, 20);
  });

  return new Uint8Array(document.output('arraybuffer'));
};

describe('extractPdf', () => {
  it('reads the text of each page, with the title and authors', async () => {
    const result = await extractPdf(
      makePdf(
        [
          'Plasma pulse changes the growth per cycle in boron carbide films.',
          'Results: the growth per cycle rises with temperature.'
        ],
        'Growth of BxC'
      )
    );

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]).toContain('Plasma pulse');
    expect(result.pages[1]).toContain('Results');
    expect(result.title).toBe('Growth of BxC');
    expect(result.authors).toBe('Ada Lovelace');
  });

  it('refuses a file that is not a PDF', async () => {
    await expect(
      extractPdf(new TextEncoder().encode('hello'))
    ).rejects.toMatchObject({
      reason: 'unreadable'
    });
  });

  it('refuses a PDF with no text, as a scan has', async () => {
    const empty = new jsPDF();
    empty.rect(10, 10, 50, 50);

    await expect(
      extractPdf(new Uint8Array(empty.output('arraybuffer')))
    ).rejects.toBeInstanceOf(PdfRefusal);
  });
});

describe('extractReadable', () => {
  const HTML = `<html><head><title>Boron carbide ALD</title></head><body>
    <nav>Home | About | Contact</nav>
    <article><h1>Boron carbide ALD</h1>
    <p>${'The growth per cycle depends on the plasma pulse and the temperature. '.repeat(6)}</p>
    <p>${'Thickness was measured by ellipsometry on silicon wafers. '.repeat(6)}</p></article>
    <script>alert('x')</script></body></html>`;

  it('keeps the article, drops scripts, and gives the title', () => {
    const page = extractReadable(HTML, 'https://example.com/a');

    expect(page.title).toBe('Boron carbide ALD');
    expect(page.text).toContain('growth per cycle');
    expect(page.text).toContain('ellipsometry');
    expect(page.text).not.toContain("alert('x')");
  });

  it('falls back to the page text when it does not look like an article', () => {
    const page = extractReadable(
      '<html><body><div>Short note about TEB dose.</div></body></html>',
      'https://example.com/b'
    );

    expect(page.text).toContain('Short note about TEB dose.');
  });
});

describe('buildStoredText', () => {
  it('marks the pages of a PDF so a passage can be cited with its page', () => {
    const { text, isTruncated } = buildStoredText(['one', 'two'], true);

    expect(text).toBe('[Page 1]\none\n\n[Page 2]\ntwo');
    expect(isTruncated).toBe(false);
  });

  it('keeps pasted text as it is', () => {
    expect(buildStoredText(['just words'], false).text).toBe('just words');
  });

  it('cuts text over the limit and says so', () => {
    const { text, isTruncated } = buildStoredText(
      ['x'.repeat(MAX_TEXT_CHARS + 50)],
      false
    );

    expect(isTruncated).toBe(true);
    expect(text.startsWith('x'.repeat(100))).toBe(true);
    expect(text).toContain('length limit was reached');
  });
});

describe('readSlice', () => {
  it('returns part of the text with where it starts and how long the whole is', () => {
    expect(readSlice('abcdefghij', 2, 3)).toEqual({
      text: 'cde',
      from: 2,
      totalCharacters: 10
    });
    expect(readSlice('abc', -5, 2).text).toBe('ab');
  });
});
