import { describe, expect, it } from 'vitest';

import { matchTechnique, summarizeTechniques } from './characterizations';

describe('matchTechnique', () => {
  it("reuses the project's spelling, whatever the case typed", () => {
    expect(matchTechnique('eds', ['SEM', 'EDS'])).toBe('EDS');
    expect(matchTechnique('  sem ', ['SEM', 'EDS'])).toBe('SEM');
  });

  it('keeps a new technique as typed, trimmed', () => {
    expect(matchTechnique('  AFM ', ['SEM'])).toBe('AFM');
  });

  it('does not treat a technique that only contains another as the same', () => {
    expect(matchTechnique('SEM-EDS', ['SEM'])).toBe('SEM-EDS');
  });
});

describe('summarizeTechniques', () => {
  it('keeps one entry per technique, in the order first recorded', () => {
    expect(
      summarizeTechniques([
        { technique: 'SEM', measuredOn: '2026-09-15' },
        { technique: 'EDX', measuredOn: '2026-09-18' },
        { technique: 'SEM', measuredOn: '2026-09-10' }
      ])
    ).toEqual([
      { technique: 'SEM', count: 2, dates: ['2026-09-10', '2026-09-15'] },
      { technique: 'EDX', count: 1, dates: ['2026-09-18'] }
    ]);
  });

  it('counts a measurement with no date but leaves the date out', () => {
    expect(
      summarizeTechniques([{ technique: 'XPS', measuredOn: null }])
    ).toEqual([{ technique: 'XPS', count: 1, dates: [] }]);
  });

  it('returns nothing for a sample that was never measured', () => {
    expect(summarizeTechniques([])).toEqual([]);
  });
});
