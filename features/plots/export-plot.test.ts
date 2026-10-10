import { describe, expect, it } from 'vitest';

import { dataUrlToBytes, fileNameFor, readChartSvg } from './export-plot';

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

describe('dataUrlToBytes', () => {
  it('decodes base64 data', () => {
    expect([...dataUrlToBytes('data:text/plain;base64,QUJD')]).toEqual([
      65, 66, 67
    ]);
  });
});

describe('readChartSvg', () => {
  it('reads the drawn chart with its size, and is null before it is drawn', () => {
    const container = document.createElement('div');
    expect(readChartSvg(container)).toBeNull();

    container.innerHTML =
      '<svg class="recharts-surface foo" width="600" height="300" style="x:y"><circle/></svg>';
    const chart = readChartSvg(container);

    expect(chart).toMatchObject({ width: 600, height: 300 });
    expect(chart?.svg).toContain('<circle');
    expect(chart?.svg).toContain('viewBox="0 0 600 300"');
    expect(chart?.svg).not.toContain('style=');
  });
});
