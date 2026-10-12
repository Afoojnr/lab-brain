import { describe, expect, it } from 'vitest';

import { legendTitleFor } from './legend-title';

const COLUMNS = [
  { key: 'p', name: 'Plasma pulse', unit: 's', kind: 'number' as const },
  { key: 'g', name: 'Gas', unit: null, kind: 'text' as const }
];

describe('legendTitleFor', () => {
  it('names the column coloured by, with its unit, or the study', () => {
    expect(legendTitleFor({ type: 'column', key: 'p' }, COLUMNS, 'Study')).toBe(
      'Plasma pulse (s)'
    );
    expect(legendTitleFor({ type: 'column', key: 'g' }, COLUMNS, 'Study')).toBe(
      'Gas'
    );
    expect(legendTitleFor({ type: 'study' }, COLUMNS, 'Study')).toBe('Study');
  });

  it('is undefined when not grouped or the column is gone', () => {
    expect(legendTitleFor({ type: 'none' }, COLUMNS, 'Study')).toBeUndefined();
    expect(
      legendTitleFor({ type: 'column', key: 'x' }, COLUMNS, 'Study')
    ).toBeUndefined();
  });
});
