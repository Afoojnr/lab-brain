import { describe, expect, it } from 'vitest';

import { parseSpectrum } from './parse';

/** Twelve made-up rows in the shape of the owner's export: `;` between columns, decimal comma, scientific notation. */
const ROWS = Array.from(
  { length: 12 },
  (_, index) =>
    `${(5 + index * 0.1).toExponential(6).replace('.', ',')};${(2 + index * 0.5).toExponential(6).replace('.', ',')}`
);

describe('parseSpectrum', () => {
  it('reads semicolons, decimal commas, scientific notation and Windows line ends', () => {
    const result = parseSpectrum(`${ROWS.join('\r\n')}\r\n`);

    expect(result).toMatchObject({ isOk: true, hasHeader: false });
    if (!result.isOk) return;
    expect(result.points).toHaveLength(12);
    expect(result.points[0]).toEqual({ x: 5, y: 2 });
    expect(result.points[11].y).toBeCloseTo(7.5);
  });

  it('reads commas between columns with decimal points, tabs and spaces', () => {
    const rows = Array.from({ length: 10 }, (_, i) => [600 + i, 80.5 + i]);

    for (const separator of [',', '\t', ' ']) {
      const result = parseSpectrum(rows.map(r => r.join(separator)).join('\n'));
      expect(result).toMatchObject({ isOk: true });
      if (result.isOk) expect(result.points[1]).toEqual({ x: 601, y: 81.5 });
    }
  });

  it('skips one header row and a byte order mark, and ignores further columns', () => {
    const body = Array.from({ length: 10 }, (_, i) => `${600 + i};${50 + i};9`);
    const result = parseSpectrum(
      `${String.fromCharCode(0xfeff)}Wavenumber;Transmittance;Extra\n${body.join('\n')}`
    );

    expect(result).toMatchObject({ isOk: true, hasHeader: true });
    if (result.isOk) expect(result.points).toHaveLength(10);
  });

  it('sorts the points by wavenumber', () => {
    const rows = Array.from({ length: 10 }, (_, i) => `${4000 - i};${i}`);
    const result = parseSpectrum(rows.join('\n'));

    expect(result.isOk && result.points[0].x).toBe(3991);
  });

  it('points at the exact line of a value that is not a number, never NaN or 0', () => {
    const rows = Array.from({ length: 10 }, (_, i) => `${600 + i};${50 + i}`);
    rows[4] = '604;oops';

    expect(parseSpectrum(rows.join('\n'))).toEqual({
      isOk: false,
      reason: 'invalidLine',
      line: 5
    });
  });

  it('refuses a header further down, an empty file and one with too few points', () => {
    const rows = Array.from({ length: 10 }, (_, i) => `${600 + i};${50 + i}`);
    rows.splice(3, 0, 'x;y');

    expect(parseSpectrum(rows.join('\n'))).toMatchObject({
      isOk: false,
      line: 4
    });
    expect(parseSpectrum('  \n ')).toEqual({ isOk: false, reason: 'empty' });
    expect(parseSpectrum('600;50\n601;51')).toEqual({
      isOk: false,
      reason: 'tooFewPoints'
    });
  });
});
