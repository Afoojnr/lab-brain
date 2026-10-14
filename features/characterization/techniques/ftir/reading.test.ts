import { describe, expect, it } from 'vitest';

import { guessReading } from './reading';
import { syntheticSpectrum } from './synthetic';

const spectrum = (baseline: number, depth: number, direction: 'down' | 'up') =>
  syntheticSpectrum({
    bands: [{ at: 1100, depth, width: 30 }],
    baseline,
    direction,
    noise: 0
  });

describe('guessReading', () => {
  it('takes values up to about 100 with a high typical value for percent transmittance', () => {
    expect(guessReading(spectrum(80, 50, 'down'))).toEqual({
      reading: 'transmittance',
      reason: 'percentTransmittance'
    });
  });

  it('takes small values for absorbance', () => {
    expect(guessReading(spectrum(0.1, 1.5, 'up'))).toEqual({
      reading: 'absorbance',
      reason: 'absorbanceRange'
    });
  });

  it('flags values between 0 and 1 as ambiguous (a fraction could be either)', () => {
    expect(guessReading(spectrum(0.05, 0.6, 'up'))).toEqual({
      reading: 'absorbance',
      reason: 'ambiguous'
    });
  });

  it('says it cannot tell for values that fit neither', () => {
    expect(guessReading(spectrum(500, 300, 'up')).reason).toBe('unclear');
  });
});
