import { describe, expect, it } from 'vitest';

import { dataUrlToBytes, readChartSvg } from './export-plot';

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
