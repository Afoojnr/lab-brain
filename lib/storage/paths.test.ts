import { describe, expect, it } from 'vitest';

import { datasetPath, safeSegment, withoutCollision } from './paths';

const PARTS = {
  projectName: 'Alpha',
  experimentPrefix: 'ALD',
  sampleCode: 'ALD001',
  technique: 'EDX',
  measuredOn: '2026-09-14',
  fileName: 'spectrum.txt'
};

describe('datasetPath', () => {
  it('uses one folder per project, experiment, sample and technique, with the date in the name', () => {
    expect(datasetPath(PARTS)).toBe(
      'Alpha/ALD/ALD001/EDX/2026-09-14_spectrum.txt'
    );
  });

  it('marks a measurement without a date', () => {
    expect(datasetPath({ ...PARTS, measuredOn: null })).toBe(
      'Alpha/ALD/ALD001/EDX/undated_spectrum.txt'
    );
  });

  it('cannot be steered out of its folder by a crafted name', () => {
    const path = datasetPath({
      ...PARTS,
      technique: '../../x',
      fileName: '../../etc/passwd'
    });

    const segments = path.split('/');
    expect(segments).toHaveLength(5);
    expect(segments).not.toContain('..');
    expect(segments).not.toContain('.');
  });
});

describe('safeSegment', () => {
  it('replaces separators and control characters and never returns an empty name', () => {
    expect(safeSegment('a/b\\c')).toBe('a-b-c');
    expect(safeSegment('   ')).toBe('_');
    expect(safeSegment('..hidden')).toBe('hidden');
  });
});

describe('withoutCollision', () => {
  it('keeps a free path as it is', () => {
    expect(withoutCollision('a/f.txt', ['a/other.txt'])).toBe('a/f.txt');
  });

  it('numbers a taken path before its extension', () => {
    expect(withoutCollision('a/f.txt', ['a/f.txt', 'a/f-2.txt'])).toBe(
      'a/f-3.txt'
    );
    expect(withoutCollision('a/f', ['a/f'])).toBe('a/f-2');
  });
});
