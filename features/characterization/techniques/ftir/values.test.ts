import { describe, expect, it } from 'vitest';

import { defaultFtirSettings } from './defaults';
import { processSpectrum } from './process';
import { syntheticSpectrum } from './synthetic';
import { ftirValues, peakLabel } from './values';
import type { FtirSettings } from './types';

const spectrum = syntheticSpectrum({
  bands: [{ at: 1100, depth: 40, width: 25 }],
  noise: 0
});
const settings = (changes: Partial<FtirSettings> = {}): FtirSettings => ({
  ...defaultFtirSettings(),
  peaks: [{ id: 'a', position: 1102, label: 'B–C' }],
  ...changes
});

describe('processSpectrum', () => {
  it('reads percent values as transmittance and looks for dips', () => {
    const processed = processSpectrum(spectrum, settings());

    expect(processed).toMatchObject({
      reading: 'transmittance',
      orientation: 'dip',
      isNormalised: false,
      normaliseProblem: null
    });
  });

  it('lets the user overrule the guess', () => {
    const processed = processSpectrum(
      spectrum,
      settings({ reading: 'absorbance' })
    );

    expect(processed).toMatchObject({
      reading: 'absorbance',
      orientation: 'tip'
    });
  });

  it('converts to absorbance, which flips dips into tips', () => {
    const processed = processSpectrum(
      spectrum,
      settings({ convertToAbsorbance: true })
    );

    expect(processed.reading).toBe('absorbance');
    expect(processed.orientation).toBe('tip');
    expect(processed.points[0].y).toBeCloseTo(2 - Math.log10(spectrum[0].y));
  });

  it('keeps the spectrum as it was and says why when it cannot be normalised', () => {
    const processed = processSpectrum(
      spectrum,
      settings({
        normalisation: { method: 'peak', range: null, referencePosition: null }
      })
    );

    expect(processed.points).toEqual(spectrum);
    expect(processed.isNormalised).toBe(false);
    expect(processed.normaliseProblem).toBe('noReference');
  });
});

describe('ftirValues', () => {
  it('reads the strongest point near each peak, with its label and unit', () => {
    const processed = processSpectrum(spectrum, settings());
    const [value] = ftirValues(processed, settings());

    expect(value).toMatchObject({
      id: 'peak:a',
      label: '1102 cm⁻¹ — B–C',
      unit: '%'
    });
    expect(value.value).toBeCloseTo(40, 0);
  });

  it('gives no value for a peak with no data near it, never 0', () => {
    const processed = processSpectrum(spectrum, settings());
    const values = ftirValues(processed, {
      tolerance: 10,
      peaks: [{ id: 'far', position: 9000, label: '' }]
    });

    expect(values).toEqual([]);
  });

  it('marks a normalised value as relative', () => {
    const chosen = settings({
      normalisation: { method: 'minmax', range: null, referencePosition: null }
    });
    const processed = processSpectrum(spectrum, chosen);
    const [value] = ftirValues(processed, chosen);

    expect(value.unit).toBe('a.u.');
    expect(value.label).toBe('1102 cm⁻¹ — B–C (relative)');
    expect(peakLabel({ id: 'x', position: 1650, label: ' ' }, processed)).toBe(
      '1650 cm⁻¹ (relative)'
    );
  });
});
