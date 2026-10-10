import { describe, expect, it } from 'vitest';

import { parseDecimal } from './numbers';

describe('parseDecimal', () => {
  it.each([
    ['1.5', 1.5],
    ['1,5', 1.5],
    ['  42 ', 42],
    ['-0.25', -0.25],
    ['+3', 3],
    ['.5', 0.5],
    ['1e3', 1000],
    ['2,5E-2', 0.025],
    ['0', 0]
  ])('reads %j as %s', (text, expected) => {
    expect(parseDecimal(text)).toBe(expected);
  });

  it.each([
    '',
    '  ',
    'abc',
    '1.2.3',
    '1,000.5',
    '12 kg',
    'NaN',
    'Infinity',
    '--1',
    '1e',
    '1e999'
  ])('is null, never 0 or NaN, for %j', text => {
    expect(parseDecimal(text)).toBeNull();
  });
});
