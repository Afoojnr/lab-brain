import { describe, expect, it } from 'vitest';

import { detectPeaks, mergeSuggestions, unionOfPeaks } from './peaks';
import type { DetectOptions } from './peaks';
import { syntheticSpectrum } from './synthetic';

const OPTIONS: DetectOptions = {
  orientation: 'dip',
  range: null,
  sensitivity: 0.05,
  minSpacing: 10
};
const BANDS = [
  { at: 1100, depth: 40, width: 25 },
  { at: 1650, depth: 25, width: 20 },
  { at: 2900, depth: 1.5, width: 30 }
];
const near = (positions: number[], target: number) =>
  positions.some(position => Math.abs(position - target) <= 4);

describe('detectPeaks', () => {
  it('finds the dips of a transmittance spectrum', () => {
    const spectrum = syntheticSpectrum({ bands: BANDS });
    const found = detectPeaks(spectrum, OPTIONS).map(peak => peak.x);

    expect(found).toHaveLength(2);
    expect(near(found, 1100)).toBe(true);
    expect(near(found, 1650)).toBe(true);
  });

  it('finds the tips of an absorbance spectrum', () => {
    const spectrum = syntheticSpectrum({
      bands: BANDS,
      baseline: 0.1,
      direction: 'up',
      noise: 0.0005
    });
    const found = detectPeaks(spectrum, { ...OPTIONS, orientation: 'tip' }).map(
      peak => peak.x
    );

    expect(near(found, 1100)).toBe(true);
    expect(near(found, 1650)).toBe(true);
  });

  it('reports the raw data point and its raw value, not a smoothed one', () => {
    const spectrum = syntheticSpectrum({ bands: BANDS });
    const [first] = detectPeaks(spectrum, OPTIONS);
    const point = spectrum.find(item => item.x === first.x);

    expect(point?.y).toBe(first.y);
  });

  it('keeps weaker bands only when the sensitivity is raised', () => {
    const spectrum = syntheticSpectrum({ bands: BANDS });
    const loose = detectPeaks(spectrum, { ...OPTIONS, sensitivity: 0.02 });
    const strict = detectPeaks(spectrum, { ...OPTIONS, sensitivity: 0.7 });

    expect(
      near(
        loose.map(peak => peak.x),
        2900
      )
    ).toBe(true);
    expect(strict).toHaveLength(1);
  });

  it('counts two close peaks once, keeping the stronger', () => {
    const spectrum = syntheticSpectrum({
      bands: [
        { at: 1100, depth: 30, width: 3 },
        { at: 1112, depth: 15, width: 3 }
      ],
      step: 1
    });
    const wide = detectPeaks(spectrum, { ...OPTIONS, minSpacing: 20 });
    const narrow = detectPeaks(spectrum, { ...OPTIONS, minSpacing: 2 });

    expect(wide).toHaveLength(1);
    expect(
      near(
        wide.map(peak => peak.x),
        1100
      )
    ).toBe(true);
    expect(narrow).toHaveLength(2);
  });

  it('only looks inside the chosen range', () => {
    const spectrum = syntheticSpectrum({ bands: BANDS });
    const found = detectPeaks(spectrum, {
      ...OPTIONS,
      range: { from: 1400, to: 2000 }
    }).map(peak => peak.x);

    expect(found).toHaveLength(1);
    expect(near(found, 1650)).toBe(true);
  });

  it('never calls the first or last point of the scan a peak', () => {
    // The lowest transmittance is at the very start: a cut-off edge, not a band.
    const spectrum = [
      ...Array.from({ length: 30 }, (_, i) => ({ x: 525 + i, y: 20 + i * 2 })),
      ...Array.from({ length: 30 }, (_, i) => ({ x: 555 + i, y: 80 }))
    ];

    expect(detectPeaks(spectrum, OPTIONS)).toEqual([]);
  });

  it('finds nothing in a flat or tiny spectrum', () => {
    expect(
      detectPeaks(
        Array.from({ length: 20 }, (_, i) => ({ x: i, y: 5 })),
        OPTIONS
      )
    ).toEqual([]);
    expect(detectPeaks([{ x: 1, y: 1 }], OPTIONS)).toEqual([]);
  });
});

describe('unionOfPeaks and mergeSuggestions', () => {
  it('counts a peak found in several spectra once', () => {
    const lists = [
      [
        { x: 1100, y: 1, prominence: 1 },
        { x: 1650, y: 1, prominence: 1 }
      ],
      [
        { x: 1104, y: 1, prominence: 1 },
        { x: 2900, y: 1, prominence: 1 }
      ]
    ];

    expect(unionOfPeaks(lists, 10)).toEqual([1100, 1650, 2900]);
  });

  it('keeps labelled peaks as they are and replaces the other suggestions', () => {
    let next = 0;
    const merged = mergeSuggestions(
      [
        { id: 'a', position: 1102, label: 'B–C' },
        { id: 'b', position: 3000, label: '' }
      ],
      [1100, 1650],
      10,
      () => `new${(next += 1)}`
    );

    expect(merged).toEqual([
      { id: 'a', position: 1102, label: 'B–C' },
      { id: 'new1', position: 1650, label: '' }
    ]);
  });
});
