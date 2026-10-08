import { describe, expect, it } from 'vitest';

import {
  datasetPath,
  freeFolderName,
  safeSegment,
  safeSubPath,
  withoutCollision
} from './paths';

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

describe('datasetPath for a file from an uploaded folder', () => {
  it('keeps the file in its place inside the folder', () => {
    expect(
      datasetPath({
        ...PARTS,
        fileName: 'quantification.csv',
        folder: 'ABC130',
        relativePath: 'export/Image 1_analysis_3_spot/quantification.csv'
      })
    ).toBe(
      'Alpha/ALD/ALD001/EDX/2026-09-14_ABC130/export/Image 1_analysis_3_spot/quantification.csv'
    );
  });

  it('cannot leave its folder through the relative path', () => {
    const path = datasetPath({
      ...PARTS,
      folder: 'ABC130',
      relativePath: '../../../etc/passwd'
    });

    expect(path.split('/')).not.toContain('..');
    expect(path.startsWith('Alpha/ALD/ALD001/EDX/2026-09-14_ABC130/')).toBe(
      true
    );
  });
});

describe('safeSubPath', () => {
  it('splits and sanitises, and refuses empty or too deep paths', () => {
    expect(safeSubPath('a/b/c.txt')).toEqual(['a', 'b', 'c.txt']);
    expect(safeSubPath('a//b')).toEqual(['a', 'b']);
    expect(safeSubPath('')).toBeNull();
    expect(safeSubPath(Array(20).fill('x').join('/'))).toBeNull();
  });
});

describe('freeFolderName', () => {
  const location = { ...PARTS };
  const taken = ['Alpha/ALD/ALD001/EDX/2026-09-14_ABC130/export/a.csv'];

  it('keeps a name no earlier upload used', () => {
    expect(freeFolderName(location, 'ABC131', taken)).toBe('ABC131');
  });

  it('numbers a folder that was already uploaded, so uploads never mix', () => {
    expect(freeFolderName(location, 'ABC130', taken)).toBe('ABC130-2');
    expect(
      freeFolderName(location, 'ABC130', [
        ...taken,
        'Alpha/ALD/ALD001/EDX/2026-09-14_ABC130-2/x.csv'
      ])
    ).toBe('ABC130-3');
  });
});
