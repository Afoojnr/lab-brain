import { describe, expect, it } from 'vitest';

import { characterizationFormSchema } from './schemas';

const VALID = { technique: 'SEM', measuredOn: '2026-09-15', note: '' };

const issueFor = (overrides: Partial<typeof VALID>) => {
  const result = characterizationFormSchema.safeParse({
    ...VALID,
    ...overrides
  });
  return result.success
    ? undefined
    : [result.error.issues[0]?.path.join('.'), result.error.issues[0]?.message];
};

describe('characterizationFormSchema', () => {
  it('accepts a technique with a date and a note', () => {
    expect(issueFor({ note: 'Top view' })).toBeUndefined();
  });

  it('accepts a measurement with no date, which means not recorded', () => {
    expect(issueFor({ measuredOn: '' })).toBeUndefined();
  });

  it('requires a technique', () => {
    expect(issueFor({ technique: '   ' })).toEqual([
      'technique',
      'techniqueRequired'
    ]);
  });

  it.each(['2026-13-01', '2026-02-30', 'tomorrow'])(
    'rejects the date %j',
    measuredOn => {
      expect(issueFor({ measuredOn })).toEqual(['measuredOn', 'dateInvalid']);
    }
  );

  it('trims the technique and the note', () => {
    expect(
      characterizationFormSchema.parse({
        ...VALID,
        technique: '  SEM ',
        note: '  Top view '
      })
    ).toEqual({ technique: 'SEM', measuredOn: '2026-09-15', note: 'Top view' });
  });
});
