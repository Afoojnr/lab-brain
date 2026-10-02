import { describe, expect, it } from 'vitest';

import { projectFormSchema } from './schemas';
import type { ProjectFormValues } from './schemas';

const validProject: ProjectFormValues = {
  name: 'Alpha',
  codePrefix: 'EXP',
  protocol: ''
};

// Start from a valid project and change only what the test is about, so a
// failure can only be caused by that one field.
const parseWith = (overrides: Partial<ProjectFormValues>) =>
  projectFormSchema.safeParse({ ...validProject, ...overrides });

const firstErrorFor = (overrides: Partial<ProjectFormValues>) => {
  const result = parseWith(overrides);
  return result.success ? undefined : result.error.issues[0]?.message;
};

describe('projectFormSchema', () => {
  it('accepts a complete project, with the protocol left empty', () => {
    expect(parseWith({}).success).toBe(true);
  });

  it('trims spaces around every text field', () => {
    const parsed = projectFormSchema.parse({
      name: '  Alpha  ',
      codePrefix: ' EXP ',
      protocol: '  Default method  '
    });

    expect(parsed).toEqual({
      name: 'Alpha',
      codePrefix: 'EXP',
      protocol: 'Default method'
    });
  });

  it.each(['', '   '])('rejects the name %j as missing', name => {
    expect(firstErrorFor({ name })).toBe('nameRequired');
  });

  describe('code prefix', () => {
    it.each(['EXP', 'B2', 'ABCDEF'])('accepts %j', codePrefix => {
      expect(parseWith({ codePrefix }).success).toBe(true);
    });

    it.each([
      ['a single letter', 'E'],
      ['lowercase letters', 'exp'],
      ['a leading digit', '1AB'],
      ['7 characters', 'ABCDEFG'],
      ['a symbol', 'E-X'],
      ['an empty value', '']
    ])('rejects %s', (_reason, codePrefix) => {
      expect(firstErrorFor({ codePrefix })).toBe('codePrefixInvalid');
    });
  });
});
