import { describe, expect, it } from 'vitest';

import { filterSamples } from './sample-filter';
import type { Sample } from './types';

const sample = (overrides: Partial<Sample> & Pick<Sample, 'code'>): Sample => ({
  id: overrides.code,
  experimentId: 'experiment-1',
  performedOn: null,
  values: {},
  note: null,
  implementation: null,
  observation: null,
  studyIds: [],
  createdAt: new Date(),
  ...overrides
});

const ALD001 = sample({
  code: 'ALD001',
  studyIds: ['pulse'],
  implementation: 'First pulse sample'
});
const ALD002 = sample({
  code: 'ALD002',
  studyIds: ['pulse', 'teb'],
  observation: 'Hazy near the edge'
});
const ALD003 = sample({
  code: 'ALD003',
  note: 'Changed after reactor service'
});
const SAMPLES = [ALD001, ALD002, ALD003];

describe('filterSamples', () => {
  it('keeps every sample when nothing is chosen', () => {
    expect(filterSamples(SAMPLES, {})).toEqual(SAMPLES);
    expect(filterSamples(SAMPLES, { query: '   ' })).toEqual(SAMPLES);
  });

  it('keeps only samples tagged with the chosen study, including shared ones', () => {
    expect(filterSamples(SAMPLES, { studyId: 'pulse' })).toEqual([
      ALD001,
      ALD002
    ]);
    expect(filterSamples(SAMPLES, { studyId: 'teb' })).toEqual([ALD002]);
  });

  it.each([
    ['code', 'ald003', [ALD003]],
    ['implementation', 'FIRST pulse', [ALD001]],
    ['observation', 'hazy', [ALD002]],
    ['note', 'reactor service', [ALD003]]
  ])('finds a sample by its %s, ignoring case', (_field, query, expected) => {
    expect(filterSamples(SAMPLES, { query })).toEqual(expected);
  });

  it('combines the tag and the search', () => {
    expect(filterSamples(SAMPLES, { studyId: 'pulse', query: 'hazy' })).toEqual(
      [ALD002]
    );
    expect(filterSamples(SAMPLES, { studyId: 'teb', query: 'first' })).toEqual(
      []
    );
  });
});
