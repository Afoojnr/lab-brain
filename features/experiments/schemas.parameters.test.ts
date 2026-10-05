import { describe, expect, it } from 'vitest';

import { buildParameterFormSchema, toParameterInput } from './schemas';

describe('buildParameterFormSchema', () => {
  const parse = (otherNames: string[], name: string) =>
    buildParameterFormSchema(otherNames).safeParse({
      name,
      unit: '',
      kind: 'number',
      defaultValue: ''
    });

  it('accepts a new name', () => {
    expect(parse(['Power'], 'Pulse').success).toBe(true);
  });

  it.each(['Power', 'power', '  POWER  '])(
    'rejects %j as a duplicate of an existing name, ignoring case and spaces',
    name => {
      const result = parse(['Power'], name);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('nameDuplicate');
    }
  );

  it('requires a name', () => {
    expect(parse([], '  ').error?.issues[0]?.message).toBe('nameRequired');
  });
});

describe('parameter default values', () => {
  const parseDefault = (kind: 'number' | 'text', defaultValue: string) =>
    buildParameterFormSchema([]).safeParse({
      name: 'Parameter',
      unit: '',
      kind,
      defaultValue
    });

  it.each(['100', '1,5', '  2.5  ', ''])(
    'accepts %j as the default of a number parameter',
    defaultValue => {
      expect(parseDefault('number', defaultValue).success).toBe(true);
    }
  );

  it.each(['high', '5 W', '1,000.5'])(
    'rejects %j as the default of a number parameter, on the default field',
    defaultValue => {
      const result = parseDefault('number', defaultValue);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['defaultValue'],
        message: 'defaultNotANumber'
      });
    }
  );

  it('accepts any text as the default of a text parameter', () => {
    expect(parseDefault('text', 'Ar').success).toBe(true);
  });

  it('rejects a default that does not fit a kind it was switched to', () => {
    expect(parseDefault('number', 'Ar').success).toBe(false);
  });
});

describe('toParameterInput', () => {
  const convert = (kind: 'number' | 'text', defaultValue: string) =>
    toParameterInput({ name: 'Parameter', unit: 'W', kind, defaultValue });

  it('stores a number default as a number', () => {
    expect(convert('number', '1,5').defaultValue).toBe(1.5);
  });

  it('keeps a default of zero, which is a real value, not "no default"', () => {
    expect(convert('number', '0').defaultValue).toBe(0);
  });

  it('stores no default as null', () => {
    expect(convert('number', '').defaultValue).toBeNull();
  });

  it('keeps a text default as typed', () => {
    expect(convert('text', 'Ar').defaultValue).toBe('Ar');
  });
});
