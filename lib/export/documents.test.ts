import { describe, expect, it } from 'vitest';

import { buildPdf } from './pdf';
import { buildPptx } from './pptx';

// A 1x1 PNG.
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PAGES = [
  {
    title: 'Thickness vs Temperature',
    image: { dataUrl: PIXEL, width: 800, height: 400 },
    lines: ['Cycles: 600', '8 samples plotted']
  },
  { title: 'A page without a picture', lines: [] }
];

describe('buildPdf', () => {
  it('writes a PDF with one page per entry', async () => {
    const bytes = await buildPdf(PAGES);

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(new TextDecoder('latin1').decode(bytes)).toMatch(/\/Count 2/);
  });
});

describe('buildPptx', () => {
  it('writes a PowerPoint file (a zip) with one slide per entry', async () => {
    const bytes = await buildPptx(PAGES);

    expect(new TextDecoder('latin1').decode(bytes.slice(0, 2))).toBe('PK');
    expect(new TextDecoder('latin1').decode(bytes)).toContain(
      'ppt/slides/slide2.xml'
    );
  });
});
