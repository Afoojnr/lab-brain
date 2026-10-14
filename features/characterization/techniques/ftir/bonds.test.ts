import { describe, expect, it } from 'vitest';

import { bondLabel, matchBonds, parseBondRows } from './bonds';
import type { FtirBond } from './types';

// Made-up rows for tests only: not real assignments.
const BONDS: FtirBond[] = [
  { id: 'a', bond: 'Range A', from: 790, to: 810, source: 'test' },
  { id: 'b', bond: 'Wide B', from: 700, to: 900, source: '' },
  { id: 'c', bond: 'Single C', from: 1390, to: 1390, source: '' }
];

describe('matchBonds', () => {
  it('matches a range when the peak is inside it, closest to the middle first', () => {
    expect(matchBonds(805, BONDS, 10).map(item => item.id)).toEqual(['a', 'b']);
    expect(matchBonds(790, BONDS, 10).map(item => item.id)).toEqual(['a', 'b']);
    expect(matchBonds(850, BONDS, 10).map(item => item.id)).toEqual(['b']);
  });

  it('matches a single position only within the tolerance', () => {
    expect(matchBonds(1398, BONDS, 10).map(item => item.id)).toEqual(['c']);
    expect(matchBonds(1405, BONDS, 10)).toEqual([]);
    expect(matchBonds(1405, BONDS, 20).map(item => item.id)).toEqual(['c']);
  });

  it('has nothing to offer outside every range or with an empty table', () => {
    expect(matchBonds(2000, BONDS, 10)).toEqual([]);
    expect(matchBonds(805, [], 10)).toEqual([]);
  });

  it('writes a bond with its range, or its single position', () => {
    expect(bondLabel(BONDS[0])).toBe('Range A (790–810)');
    expect(bondLabel(BONDS[2])).toBe('Single C (1390)');
  });
});

describe('parseBondRows', () => {
  const header = ['Bond', 'From (cm-1)', 'To (cm-1)', 'Source'];

  it('reads rows by header name, in any order, with a decimal comma or point', () => {
    const result = parseBondRows([
      ['source', 'to', 'bond', 'from'],
      ['a book', '810,5', 'Range A', '790.5'],
      ['', '', 'Single C', '1390']
    ]);

    expect(result.problems).toEqual([]);
    expect(result.bonds).toEqual([
      { bond: 'Range A', from: 790.5, to: 810.5, source: 'a book' },
      { bond: 'Single C', from: 1390, to: 1390, source: '' }
    ]);
  });

  it('accepts the unit spelled with a superscript and other common header names', () => {
    const result = parseBondRows([
      ['Assignment', 'From (cm⁻¹)', 'To (cm⁻¹)', 'Reference'],
      ['X', '1', '2', 'r']
    ]);

    expect(result.bonds).toEqual([{ bond: 'X', from: 1, to: 2, source: 'r' }]);
  });

  it('says the header is missing instead of guessing the columns', () => {
    expect(parseBondRows([['B–C', '790', '810']])).toEqual({
      bonds: [],
      problems: [{ row: 1, reason: 'noHeader' }]
    });
  });

  it('names the row and column of text where a number belongs, never zero', () => {
    const result = parseBondRows([
      header,
      ['A', '790', '810', ''],
      ['B', 'about 800', '', ''],
      ['C', '700', 'high', '']
    ]);

    expect(result.bonds).toHaveLength(1);
    expect(result.problems).toEqual([
      { row: 3, reason: 'notNumber', column: 'From', value: 'about 800' },
      { row: 4, reason: 'notNumber', column: 'To', value: 'high' }
    ]);
  });

  it('reports an empty bond, an empty From, a backwards range and repeats', () => {
    const result = parseBondRows(
      [
        header,
        ['', '790', '', ''],
        ['B', '', '', ''],
        ['C', '900', '800', ''],
        ['D', '100', '200', ''],
        ['d', '100', '200', ''],
        ['E', '1', '2', '']
      ],
      [{ bond: 'E', from: 1, to: 2 }]
    );

    expect(result.bonds).toEqual([
      { bond: 'D', from: 100, to: 200, source: '' }
    ]);
    expect(result.problems.map(item => [item.row, item.reason])).toEqual([
      [2, 'missingBond'],
      [3, 'missingFrom'],
      [4, 'rangeOrder'],
      [6, 'duplicate'],
      [7, 'alreadyThere']
    ]);
  });

  it('ignores blank lines but keeps the row numbers the user sees', () => {
    const result = parseBondRows([
      header,
      ['', '', '', ''],
      ['A', '1', '2', ''],
      ['B', 'x', '', '']
    ]);

    expect(result.bonds).toHaveLength(1);
    expect(result.problems).toEqual([
      { row: 4, reason: 'notNumber', column: 'From', value: 'x' }
    ]);
  });
});
