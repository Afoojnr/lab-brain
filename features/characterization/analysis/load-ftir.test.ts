import { describe, expect, it, vi } from 'vitest';

const files = vi.hoisted(() => new Map<string, string>());
vi.mock('@/features/experiments/server', () => ({
  datasetBytes: async (id: string) => {
    const text = files.get(id);

    return text === undefined
      ? null
      : { bytes: new TextEncoder().encode(text) };
  }
}));

import type { Dataset } from '@/features/experiments/shared';

import { defaultFtirSettings } from '../techniques/ftir/defaults';
import { syntheticSpectrum } from '../techniques/ftir/synthetic';
import type { AnalysisSettings } from '../types';
import { computeAnalysisValues, loadFtirSpectra } from './load';

const dataset = (id: string, fileName: string): Dataset =>
  ({ id, fileName, relativePath: null }) as Dataset;

const text = (depth: number) =>
  syntheticSpectrum({ bands: [{ at: 1100, depth, width: 25 }], noise: 0 })
    .map(point => `${point.x};${point.y}`)
    .join('\n');

const settings = (
  changes: Partial<AnalysisSettings> = {}
): AnalysisSettings => ({
  numerator: 'B',
  denominator: 'N',
  excludedSpots: [],
  datasetId: null,
  ftir: {
    ...defaultFtirSettings(),
    peaks: [{ id: 'a', position: 1100, label: 'B–C' }]
  },
  selectedValueIds: [],
  targets: {},
  ...changes
});

describe('loadFtirSpectra', () => {
  it('reads spectra, reports a file it cannot read with its line, and skips EDX files', async () => {
    files.set('good', text(40));
    files.set(
      'bad',
      `${text(40).split('\n').slice(0, 20).join('\n')}\n700;oops`
    );

    const result = await loadFtirSpectra([
      dataset('good', 'a.csv'),
      dataset('bad', 'b.txt'),
      dataset('edx', 'quantification.csv'),
      dataset('emsa', 'spectrum.emsa'),
      dataset('image', 'photo.png')
    ]);

    expect(result.map(file => file.datasetId)).toEqual(['good', 'bad']);
    expect(result[0].points).not.toBeNull();
    expect(result[1]).toMatchObject({
      points: null,
      reason: 'invalidLine',
      line: 21
    });
  });
});

describe('computeAnalysisValues for FTIR', () => {
  it('recomputes the value at each peak from the stored file, not from anything the browser says', async () => {
    files.set('a', text(40));

    const values = await computeAnalysisValues(
      'ftir',
      [dataset('a', 'a.csv')],
      settings()
    );

    expect(values).toHaveLength(1);
    expect(values?.[0]).toMatchObject({
      id: 'peak:a',
      label: '1100 cm⁻¹ — B–C',
      unit: '%'
    });
    expect(values?.[0].value).toBeCloseTo(40, 0);
  });

  it('uses the chosen file, else the first readable one', async () => {
    files.set('shallow', text(10));
    files.set('deep', text(60));
    const both = [dataset('shallow', 's.csv'), dataset('deep', 'd.csv')];

    const chosen = await computeAnalysisValues(
      'ftir',
      both,
      settings({ datasetId: 'deep' })
    );
    const fallback = await computeAnalysisValues('ftir', both, settings());

    expect(chosen?.[0].value).toBeCloseTo(20, 0);
    expect(fallback?.[0].value).toBeCloseTo(70, 0);
  });

  it('has nothing to compute without a readable file or without FTIR settings', async () => {
    expect(await computeAnalysisValues('ftir', [], settings())).toBeNull();

    files.set('a', text(40));
    expect(
      await computeAnalysisValues(
        'ftir',
        [dataset('a', 'a.csv')],
        settings({ ftir: null })
      )
    ).toBeNull();
  });
});
