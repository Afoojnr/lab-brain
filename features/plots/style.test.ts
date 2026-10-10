import { describe, expect, it } from 'vitest';

import { axisDomain } from './style';

describe('axisDomain', () => {
  it('is automatic when nothing is typed', () => {
    expect(axisDomain('', '', false)).toEqual(['auto', 'auto']);
  });

  it('uses the bounds that are numbers, with a decimal comma, and leaves the other open', () => {
    expect(axisDomain('0,5', '10', false)).toEqual([0.5, 10]);
    expect(axisDomain('', '10', false)).toEqual(['auto', 10]);
    expect(axisDomain('abc', '10', false)).toEqual(['auto', 10]);
  });

  it('allows 0 and negative bounds on a linear axis', () => {
    expect(axisDomain('0', '5', false)).toEqual([0, 5]);
    expect(axisDomain('-5', '', false)).toEqual([-5, 'auto']);
  });

  it('leaves a bound of 0 or less automatic on a logarithmic axis', () => {
    expect(axisDomain('0', '100', true)).toEqual(['auto', 100]);
    expect(axisDomain('-1', '', true)).toEqual(['auto', 'auto']);
    expect(axisDomain('1', '100', true)).toEqual([1, 100]);
  });

  it('ignores a range whose minimum is not below its maximum', () => {
    expect(axisDomain('10', '5', false)).toEqual(['auto', 'auto']);
    expect(axisDomain('5', '5', false)).toEqual(['auto', 'auto']);
  });
});
