import { describe, expect, it } from 'vitest';

import {
  buildStudyFormSchema,
  buildExperimentFormSchema,
  projectFormSchema
} from './schemas';

describe('projectFormSchema', () => {
  const parse = (input: { name: string; description: string }) =>
    projectFormSchema.safeParse(input);

  it('accepts a project with the description left empty', () => {
    expect(parse({ name: 'ALD of BxC', description: '' }).success).toBe(true);
  });

  it('trims spaces around every text field', () => {
    expect(
      projectFormSchema.parse({
        name: '  ALD of BxC  ',
        description: '  PE ALD  '
      })
    ).toEqual({ name: 'ALD of BxC', description: 'PE ALD' });
  });

  it.each(['', '   '])('rejects the name %j as missing', name => {
    const result = parse({ name, description: '' });

    expect(result.error?.issues[0]?.message).toBe('nameRequired');
  });

  it('rejects a description over 1000 characters', () => {
    const result = parse({ name: 'ALD of BxC', description: 'x'.repeat(1001) });

    expect(result.error?.issues[0]?.message).toBe('descriptionTooLong');
  });
});

describe('buildExperimentFormSchema', () => {
  const issueFor = (otherPrefixes: string[], codePrefix: string) => {
    const result = buildExperimentFormSchema(otherPrefixes).safeParse({
      name: 'Deposition',
      codePrefix,
      protocol: ''
    });
    return result.success ? undefined : result.error.issues[0]?.message;
  };

  it('accepts a new experiment', () => {
    expect(
      buildExperimentFormSchema(['PSL']).safeParse({
        name: 'Deposition',
        codePrefix: 'ALD',
        protocol: ''
      }).success
    ).toBe(true);
  });

  it('trims spaces around the name and prefix', () => {
    expect(
      buildExperimentFormSchema([]).parse({
        name: '  Deposition ',
        codePrefix: ' ALD ',
        protocol: '  Clean, then run.  '
      })
    ).toEqual({
      name: 'Deposition',
      codePrefix: 'ALD',
      protocol: 'Clean, then run.'
    });
  });

  it.each(['EXP', 'B2', 'ABCDEF'])('accepts the prefix %j', codePrefix => {
    expect(issueFor([], codePrefix)).toBeUndefined();
  });

  it.each([
    ['a single letter', 'E'],
    ['lowercase letters', 'ald'],
    ['a leading digit', '1AB'],
    ['7 characters', 'ABCDEFG'],
    ['a symbol', 'A-D'],
    ['an empty value', '']
  ])('rejects %s', (_reason, codePrefix) => {
    expect(issueFor([], codePrefix)).toBe('codePrefixInvalid');
  });

  it("rejects a prefix another experiment in the project already uses, so sample codes can't collide", () => {
    expect(issueFor(['ALD', 'PSL'], 'PSL')).toBe('codePrefixDuplicate');
  });

  it('requires a name', () => {
    const result = buildExperimentFormSchema([]).safeParse({
      name: '   ',
      codePrefix: 'ALD',
      protocol: ''
    });

    expect(result.error?.issues[0]?.message).toBe('nameRequired');
  });

  it('rejects a protocol over 1000 characters', () => {
    const result = buildExperimentFormSchema([]).safeParse({
      name: 'Deposition',
      codePrefix: 'ALD',
      protocol: 'x'.repeat(1001)
    });

    expect(result.error?.issues[0]?.message).toBe('protocolTooLong');
  });
});

describe('buildStudyFormSchema', () => {
  const issueFor = (otherNames: string[], name: string) => {
    const result = buildStudyFormSchema(otherNames).safeParse({
      name,
      description: ''
    });
    return result.success ? undefined : result.error.issues[0]?.message;
  };

  it('trims the name and description', () => {
    expect(
      buildStudyFormSchema([]).parse({
        name: '  TEB study ',
        description: '  Vary the TEB dose. '
      })
    ).toEqual({ name: 'TEB study', description: 'Vary the TEB dose.' });
  });

  it('requires a name', () => {
    expect(issueFor([], '   ')).toBe('nameRequired');
  });

  it('rejects a name the experiment already has, ignoring case', () => {
    expect(issueFor(['Plasma pulse study'], 'plasma PULSE study')).toBe(
      'nameDuplicate'
    );
    expect(issueFor(['Plasma pulse study'], 'TEB study')).toBeUndefined();
  });
});
