import { describe, expect, it } from 'vitest';

import { isViewable, MAX_PREVIEW_BYTES, viewerKind } from './kinds';

describe('viewerKind', () => {
  it.each([
    ['photo.PNG', 'image'],
    ['Image 1.tiff', 'tiff'],
    ['a.tif', 'tiff'],
    ['table.csv', 'csv'],
    ['book.xlsx', 'sheet'],
    ['spectrum.emsa', 'text'],
    ['project.phen', 'other'],
    ['report.odt', 'other'],
    ['noextension', 'other']
  ])('%s is shown as %s', (name, kind) => {
    expect(viewerKind(name, 1000)).toBe(kind);
  });

  it('does not preview a large table or text, but still shows a large image', () => {
    expect(viewerKind('big.csv', MAX_PREVIEW_BYTES + 1)).toBe('other');
    expect(viewerKind('big.tiff', MAX_PREVIEW_BYTES * 3)).toBe('tiff');
  });

  it('knows which kinds the viewer shows', () => {
    expect(isViewable('csv')).toBe(true);
    expect(isViewable('other')).toBe(false);
  });
});
