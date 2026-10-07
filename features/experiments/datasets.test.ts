import { describe, expect, it } from 'vitest';

import { contentTypeFor, formatFileSize, isInlineImage } from './datasets';

describe('contentTypeFor', () => {
  it.each([
    ['photo.PNG', 'image/png'],
    ['a.jpeg', 'image/jpeg'],
    ['data.csv', 'text/csv'],
    ['spectrum.spx', 'application/octet-stream'],
    ['noextension', 'application/octet-stream'],
    ['evil.html', 'application/octet-stream'],
    ['evil.svg', 'application/octet-stream']
  ])('%s is %s', (fileName, expected) => {
    expect(contentTypeFor(fileName)).toBe(expected);
  });
});

describe('isInlineImage', () => {
  it('shows only the common browser image types inline', () => {
    expect(isInlineImage('image/png')).toBe(true);
    expect(isInlineImage('image/tiff')).toBe(false);
    expect(isInlineImage('text/html')).toBe(false);
  });
});

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [2048, '2 KB'],
    [1572864, '1.5 MB']
  ])('%i bytes is %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});
