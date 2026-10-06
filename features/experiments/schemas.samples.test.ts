import { describe, expect, it } from 'vitest';

import { buildSampleFormSchema, toSampleInput } from './schemas';
import type { SampleFormValues } from './schemas';
import type { ParameterDefinition } from './types';

const definitions: ParameterDefinition[] = [
  {
    id: 'power',
    experimentId: 'experiment-1',
    name: 'Power',
    unit: 'W',
    kind: 'number',
    role: 'parameter',
    defaultValue: null,
    position: 0
  },
  {
    id: 'gas',
    experimentId: 'experiment-1',
    name: 'Gas',
    unit: null,
    kind: 'text',
    role: 'parameter',
    defaultValue: null,
    position: 1
  }
];

const STUDIES = [{ id: 'pulse' }, { id: 'teb' }];

const validSample: SampleFormValues = {
  code: 'ALD251',
  performedOn: '2026-09-04',
  values: { power: '100', gas: 'Ar' },
  studyIds: [],
  implementation: 'Why it was made',
  observation: '',
  note: ''
};

const issuesFor = (values: SampleFormValues, otherCodes: string[] = []) => {
  const result = buildSampleFormSchema(definitions, otherCodes).safeParse(
    values
  );
  return result.success
    ? []
    : result.error.issues.map(issue => [issue.path.join('.'), issue.message]);
};

describe('buildSampleFormSchema', () => {
  it('accepts a complete sample', () => {
    expect(issuesFor(validSample)).toEqual([]);
  });

  it('accepts a sample with every value left empty, which means not recorded', () => {
    expect(
      issuesFor({
        ...validSample,
        performedOn: '',
        values: { power: '', gas: '' },
        implementation: ''
      })
    ).toEqual([]);
  });

  it('points at the exact value holding text in a number column', () => {
    expect(
      issuesFor({ ...validSample, values: { power: 'high', gas: 'Ar' } })
    ).toEqual([['values.power', 'valueNotANumber']]);
  });

  it('accepts a decimal comma in a number column', () => {
    expect(
      issuesFor({ ...validSample, values: { power: '1,5', gas: '' } })
    ).toEqual([]);
  });

  it.each(['ALD001', 'ald001', '  ALD001  '])(
    'rejects the code %j when another sample in the project has it, ignoring case and spaces',
    code => {
      expect(issuesFor({ ...validSample, code }, ['ALD001', 'PSL004'])).toEqual(
        [['code', 'codeDuplicate']]
      );
    }
  );

  it('treats a code in another experiment of the project as taken, since codes are unique per project', () => {
    expect(issuesFor({ ...validSample, code: 'PSL004' }, ['PSL004'])).toEqual([
      ['code', 'codeDuplicate']
    ]);
  });

  it.each(['', '   '])('rejects %j as a missing code', code => {
    expect(issuesFor({ ...validSample, code })).toEqual([
      ['code', 'codeRequired']
    ]);
  });

  it('accepts a code with a suffix, such as an annealing sample', () => {
    expect(issuesFor({ ...validSample, code: 'ALD023_Annealing' })).toEqual([]);
  });

  it.each(['2026-13-01', '2026-02-30', 'yesterday'])(
    'rejects the date %j',
    performedOn => {
      expect(issuesFor({ ...validSample, performedOn })[0]?.[0]).toBe(
        'performedOn'
      );
    }
  );

  it('reports every problem at once, not just the first', () => {
    expect(
      issuesFor({
        ...validSample,
        code: '',
        values: { power: 'x', gas: '' }
      })
    ).toEqual(
      expect.arrayContaining([
        ['code', 'codeRequired'],
        ['values.power', 'valueNotANumber']
      ])
    );
  });
});

describe('note', () => {
  it('rejects a note over 500 characters', () => {
    expect(issuesFor({ ...validSample, note: 'x'.repeat(501) })).toEqual([
      ['note', 'noteTooLong']
    ]);
  });

  it('stores a trimmed note, and an empty one as null', () => {
    const stored = (note: string) =>
      toSampleInput(
        definitions,
        STUDIES,
        buildSampleFormSchema(definitions, []).parse({
          ...validSample,
          note
        })
      ).note;

    expect(stored('  After service ')).toBe('After service');
    expect(stored('')).toBeNull();
  });
});

describe('toSampleInput', () => {
  it('converts typed-in text into stored numbers and omits empty cells', () => {
    expect(toSampleInput(definitions, STUDIES, validSample)).toEqual({
      code: 'ALD251',
      performedOn: '2026-09-04',
      values: { power: 100, gas: 'Ar' },
      studyIds: [],
      implementation: 'Why it was made',
      observation: null,
      note: null
    });
  });

  it('stores an empty date and empty texts as null', () => {
    expect(
      toSampleInput(definitions, STUDIES, {
        ...validSample,
        performedOn: '',
        implementation: ''
      })
    ).toMatchObject({ performedOn: null, implementation: null });
  });

  it('keeps a typed-in zero, which is a real value', () => {
    const result = toSampleInput(definitions, STUDIES, {
      ...validSample,
      values: { power: '0', gas: '' }
    });

    expect(result.values).toEqual({ power: 0 });
  });

  it('drops values for parameters the experiment does not have', () => {
    const result = toSampleInput(definitions, STUDIES, {
      ...validSample,
      values: { power: '1', gas: '', stale: '9' }
    });

    expect(result.values).toEqual({ power: 1 });
  });
});

describe('studies of a sample', () => {
  const stored = (studyIds: string[]) =>
    toSampleInput(definitions, STUDIES, { ...validSample, studyIds }).studyIds;

  it('keeps the chosen studies of the experiment, once each', () => {
    expect(stored(['teb', 'pulse', 'teb'])).toEqual(['pulse', 'teb']);
  });

  it("drops a study id that is not one of the experiment's studies", () => {
    expect(stored(['pulse', 'someone-elses-study'])).toEqual(['pulse']);
  });
});
