import { describe, expect, it } from 'vitest';

import { captionLines } from './export-caption';
import { DEFAULT_STYLE } from '../style/style';

const PARTS = {
  source: 'Source: ALD of BxC',
  filters: 'Filters: Cycles: 600',
  counts: '2 samples plotted · 18 unticked'
};

describe('captionLines', () => {
  it('keeps only the filters by default', () => {
    expect(captionLines(PARTS, DEFAULT_STYLE)).toEqual([
      'Filters: Cycles: 600'
    ]);
  });

  it('adds the source and the counts when asked for', () => {
    expect(captionLines(PARTS, { showSource: true, showCounts: true })).toEqual(
      [
        'Source: ALD of BxC',
        'Filters: Cycles: 600',
        '2 samples plotted · 18 unticked'
      ]
    );
  });

  it('is empty when nothing applies, and skips a source that does not exist', () => {
    expect(
      captionLines(
        { source: null, filters: null, counts: 'x' },
        { showSource: true, showCounts: false }
      )
    ).toEqual([]);
  });
});
