import { describe, expect, it } from 'vitest';

import { dataUrlToBytes, readChartSvg } from './figure-file';

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

describe('readChartSvg with a legend', () => {
  it('reads the chart, not a legend icon, even when the icon comes first', () => {
    const container = document.createElement('div');
    container.innerHTML =
      '<svg class="recharts-surface" width="14" height="14"><path id="icon"/></svg>' +
      '<svg class="recharts-surface" width="600" height="300"><circle id="chart"/></svg>';
    // jsdom has no layout, so give each its drawn size.
    const [icon, chart] = container.querySelectorAll('svg');
    icon.getBoundingClientRect = () => ({ width: 14, height: 14 }) as DOMRect;
    chart.getBoundingClientRect = () =>
      ({ width: 600, height: 300 }) as DOMRect;

    const read = readChartSvg(container);

    expect(read).toMatchObject({ width: 600, height: 300 });
    expect(read?.svg).toContain('id="chart"');
    expect(read?.svg).not.toContain('id="icon"');
  });
});
