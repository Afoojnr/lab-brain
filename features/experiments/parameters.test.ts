import { describe, expect, it } from 'vitest';

import {
  CALENDAR_DATE_FORMAT,
  defaultSampleInputs,
  duplicateSampleInputs,
  emptyInputs,
  parseParameterInput,
  parseParameterInputs,
  sampleToInputs,
  suggestNextSampleCode,
  toCalendarDate
} from './parameters';
import type { ParameterDefinition } from './types';

const definition = (
  overrides: Partial<ParameterDefinition>
): ParameterDefinition => ({
  id: 'p1',
  experimentId: 's1',
  name: 'Parameter',
  unit: null,
  kind: 'number',
  role: 'parameter',
  defaultValue: null,
  position: 0,
  ...overrides
});

const POWER = definition({
  id: 'power',
  name: 'Power',
  unit: 'W',
  position: 0
});
const PULSE = definition({
  id: 'pulse',
  name: 'Pulse',
  unit: 's',
  position: 1
});
const GAS = definition({ id: 'gas', name: 'Gas', kind: 'text', position: 2 });

describe('parseParameterInput', () => {
  it.each([
    ['1.5', 1.5],
    ['1,5', 1.5],
    ['  42  ', 42],
    ['-3', -3],
    ['.5', 0.5],
    ['1e-3', 0.001],
    ['0', 0]
  ])('reads %j as the number %d', (raw, expected) => {
    expect(parseParameterInput(raw, 'number')).toEqual({
      isValid: true,
      value: expected
    });
  });

  it.each([
    'abc',
    '5 s',
    '1,000.5',
    '1.2.3',
    '--1',
    'Infinity',
    '1e999',
    'NaN'
  ])(
    'rejects %j in a number parameter instead of turning it into NaN or 0',
    raw => {
      expect(parseParameterInput(raw, 'number')).toEqual({ isValid: false });
    }
  );

  it.each(['', '   '])('treats %j as not recorded, never as zero', raw => {
    expect(parseParameterInput(raw, 'number')).toEqual({
      isValid: true,
      value: undefined
    });
  });

  it('keeps text as typed, trimmed', () => {
    expect(parseParameterInput('  Ar  ', 'text')).toEqual({
      isValid: true,
      value: 'Ar'
    });
  });
});

describe('parseParameterInputs', () => {
  it('returns parsed values, omits empty ones and reports the invalid ids', () => {
    const result = parseParameterInputs([POWER, PULSE, GAS], {
      power: '100',
      pulse: 'ten',
      gas: ''
    });

    expect(result.values).toEqual({ power: 100 });
    expect(result.invalidIds).toEqual(['pulse']);
  });

  it('ignores inputs that match no parameter', () => {
    const result = parseParameterInputs([POWER], { power: '5', unknown: 'x' });

    expect(result.values).toEqual({ power: 5 });
  });
});

describe('suggestNextSampleCode', () => {
  it('starts an experiment at 001', () => {
    expect(suggestNextSampleCode('ALD', [])).toBe('ALD001');
  });

  it('continues after the highest number, not the count', () => {
    expect(suggestNextSampleCode('ALD', ['ALD001', 'ALD250', 'ALD007'])).toBe(
      'ALD251'
    );
  });

  it('grows past three digits', () => {
    expect(suggestNextSampleCode('ALD', ['ALD999'])).toBe('ALD1000');
  });

  it('ignores codes that are not exactly prefix + digits, such as a hand-typed annealing code', () => {
    expect(
      suggestNextSampleCode('ALD', [
        'ALD023',
        'ALD023_Annealing',
        'ALD999_Test'
      ])
    ).toBe('ALD024');
  });

  it("ignores other experiment's codes, and codes that only start the same way", () => {
    expect(suggestNextSampleCode('ALD', ['PSL040', 'ALDX050', 'ALD005'])).toBe(
      'ALD006'
    );
  });

  it('matches the prefix case-insensitively but suggests it as given', () => {
    expect(suggestNextSampleCode('ALD', ['ald010'])).toBe('ALD011');
  });
});

describe('defaultSampleInputs', () => {
  const withDefault = (id: string, defaultValue: number | string | null) =>
    definition({ id, defaultValue });

  it("prefers a parameter's own default over the previous sample's value", () => {
    expect(
      defaultSampleInputs([withDefault('power', 100)], {
        values: { power: 250 }
      })
    ).toEqual({ power: '100' });
  });

  it('falls back to the previous sample when the parameter has no default', () => {
    expect(
      defaultSampleInputs([withDefault('power', null)], {
        values: { power: 250 }
      })
    ).toEqual({ power: '250' });
  });

  it('keeps a default of zero instead of treating it as missing', () => {
    expect(
      defaultSampleInputs([withDefault('power', 0)], { values: { power: 250 } })
    ).toEqual({ power: '0' });
  });

  it('prefills a text default as typed', () => {
    expect(defaultSampleInputs([withDefault('gas', 'Ar')], undefined)).toEqual({
      gas: 'Ar'
    });
  });

  it('starts empty when there is neither a default nor an earlier sample', () => {
    expect(defaultSampleInputs([POWER], undefined)).toEqual({ power: '' });
  });
});

describe('results are never prefilled', () => {
  const THICKNESS = definition({
    id: 'thickness',
    name: 'Thickness',
    role: 'result',
    position: 5
  });

  it('leaves a result empty on a new sample, even when the previous sample has one', () => {
    expect(
      defaultSampleInputs([POWER, THICKNESS], {
        values: { power: 250, thickness: 41.2 }
      })
    ).toEqual({ power: '250', thickness: '' });
  });

  it('copies parameters but not results when duplicating a sample', () => {
    expect(
      duplicateSampleInputs([POWER, THICKNESS], {
        values: { power: 250, thickness: 41.2 }
      })
    ).toEqual({ power: '250', thickness: '' });
  });
});

describe('sampleToInputs and emptyInputs', () => {
  it("shows an existing sample's values as typed text, keeping zero and leaving gaps empty", () => {
    expect(
      sampleToInputs([POWER, PULSE, GAS], { values: { power: 0, gas: 'Ar' } })
    ).toEqual({ power: '0', pulse: '', gas: 'Ar' });
  });

  it('starts every parameter empty', () => {
    expect(emptyInputs([POWER, GAS])).toEqual({ power: '', gas: '' });
  });
});

describe('calendar dates', () => {
  it('reads a stored date as midnight UTC, so it never shifts a day', () => {
    expect(toCalendarDate('2026-09-04').toISOString()).toBe(
      '2026-09-04T00:00:00.000Z'
    );
  });

  it('formats in UTC, matching how it was read', () => {
    expect(CALENDAR_DATE_FORMAT.timeZone).toBe('UTC');
  });
});
