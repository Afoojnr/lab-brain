import { describe, expect, it } from 'vitest';

import { composeFigure, resolveCssVariables, wrapText } from './export-figure';

const CHART = {
  svg: '<svg class="recharts-surface" width="600" height="300"><circle fill="var(--plot-1)" stroke="var(--background)"/><text fill="var(--muted-foreground)">x</text></svg>',
  width: 600,
  height: 300
};

describe('resolveCssVariables', () => {
  it('turns the theme variables into the light-theme colours', () => {
    expect(
      resolveCssVariables('fill="var(--plot-2)" stroke="var(--background)"')
    ).toBe('fill="#eb6834" stroke="#ffffff"');
  });

  it('keeps an unknown variable readable', () => {
    expect(resolveCssVariables('fill="var(--nope)"')).toBe('fill="#141414"');
  });
});

describe('wrapText', () => {
  it('breaks at spaces and never loses a word', () => {
    expect(wrapText('one two three four', 9)).toEqual([
      'one two',
      'three',
      'four'
    ]);
    expect(wrapText('', 10)).toEqual([]);
    expect(wrapText('extraordinarily', 5)).toEqual(['extraordinarily']);
  });
});

describe('composeFigure', () => {
  const figure = composeFigure({
    chart: CHART,
    title: 'Thickness <nm> & GPC',
    lines: ['Source: ALD of BxC', 'Cycles: 600'],
    legend: [
      { label: '600', color: 'var(--plot-1)', shape: 'circle' },
      { label: '800', color: 'var(--plot-2)', shape: 'square' }
    ]
  });

  it('is standalone: no CSS variables, a white background and the chart inside', () => {
    expect(figure.svg).not.toContain('var(');
    expect(figure.svg).toContain('<rect width="648"');
    expect(figure.svg).toContain('class="recharts-surface"');
    expect(figure.svg).toContain('fill="#2a78d6"');
    expect(figure.width).toBe(648);
  });

  it('escapes the text it writes', () => {
    expect(figure.svg).toContain('Thickness &lt;nm&gt; &amp; GPC');
  });

  it('writes the caption lines and one legend entry per group', () => {
    expect(figure.svg).toContain('Source: ALD of BxC');
    expect(figure.svg).toContain('Cycles: 600');
    expect(figure.svg).toContain('>800</text>');
  });

  it('draws no legend for a single group and is shorter without a title', () => {
    const single = composeFigure({
      chart: CHART,
      legend: [{ label: 'only', color: 'var(--plot-1)', shape: 'circle' }]
    });

    expect(single.svg).not.toContain('>only</text>');
    expect(single.height).toBe(300 + 48);
    expect(figure.height).toBeGreaterThan(single.height);
  });

  it('scales the text with the text size', () => {
    const big = composeFigure({
      chart: CHART,
      title: 'T',
      lines: ['A line'],
      textScale: 1.25
    });

    expect(big.svg).toContain('font-size="25"');
    expect(big.svg).toContain('font-size="16.25"');
    expect(big.height).toBeGreaterThan(
      composeFigure({ chart: CHART, title: 'T', lines: ['A line'] }).height
    );
  });
});
