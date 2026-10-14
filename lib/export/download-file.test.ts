import { describe, expect, it } from 'vitest';

import { fileNameFor } from './download-file';

describe('fileNameFor', () => {
  it('makes a plain file name from a title', () => {
    expect(fileNameFor('Thickness (nm) vs Température', 'png')).toBe(
      'thickness-nm-vs-temperature.png'
    );
  });

  it('falls back to "plot" when the title has no letters or digits', () => {
    expect(fileNameFor('— ☆ —', 'pdf')).toBe('plot.pdf');
  });
});
