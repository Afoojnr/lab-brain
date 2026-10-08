import { describe, expect, it } from 'vitest';

import { checkSelection, formatValue, resolveTarget } from './results';
import type { AnalysisValue, ColumnTarget } from './types';

const VALUE: AnalysisValue = {
  id: 'ratio',
  label: 'B/N',
  unit: null,
  value: 1.5
};
const COLUMNS = [
  { id: 'c1', name: 'b/n', unit: null },
  { id: 'c2', name: 'Thickness', unit: 'nm' }
];

describe('resolveTarget', () => {
  it('keeps the earlier choice when that column still exists', () => {
    expect(
      resolveTarget(VALUE, { type: 'column', columnId: 'c2' }, COLUMNS)
    ).toEqual({
      type: 'column',
      columnId: 'c2'
    });
  });

  it('keeps a new column the user was naming', () => {
    const saved: ColumnTarget = { type: 'new', name: 'Ratio', unit: '' };

    expect(resolveTarget(VALUE, saved, COLUMNS)).toEqual(saved);
  });

  it('falls back to the result column with the same name, ignoring case', () => {
    expect(
      resolveTarget(VALUE, { type: 'column', columnId: 'gone' }, COLUMNS)
    ).toEqual({
      type: 'column',
      columnId: 'c1'
    });
    expect(resolveTarget(VALUE, undefined, COLUMNS)).toEqual({
      type: 'column',
      columnId: 'c1'
    });
  });

  it('offers a new column named after the value when none matches', () => {
    const value = { ...VALUE, label: 'Boron', unit: 'at.%' };

    expect(resolveTarget(value, undefined, COLUMNS)).toEqual({
      type: 'new',
      name: 'Boron',
      unit: 'at.%'
    });
  });
});

describe('checkSelection', () => {
  const pick = (target: ColumnTarget) => ({ value: VALUE, target });

  it('needs at least one value', () => {
    expect(checkSelection([])).toBe('none');
  });

  it('refuses two values for one column', () => {
    const same: ColumnTarget = { type: 'column', columnId: 'c1' };

    expect(checkSelection([pick(same), pick(same)])).toBe('columnTaken');
  });

  it('refuses a new column without a name', () => {
    expect(checkSelection([pick({ type: 'new', name: '  ', unit: '' })])).toBe(
      'nameMissing'
    );
  });

  it('accepts a good selection', () => {
    expect(
      checkSelection([
        pick({ type: 'column', columnId: 'c1' }),
        pick({ type: 'new', name: 'X', unit: '' })
      ])
    ).toBeNull();
  });
});

describe('formatValue', () => {
  it('shows up to 6 significant digits', () => {
    expect(formatValue(1.6666666666)).toBe('1.66667');
    expect(formatValue(0)).toBe('0');
    expect(formatValue(52.5)).toBe('52.5');
  });
});
