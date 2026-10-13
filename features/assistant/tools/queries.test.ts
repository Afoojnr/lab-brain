import { describe, expect, it } from 'vitest';

import {
  findSamples,
  getSample,
  MAX_TOOL_ROWS,
  searchNotes,
  type ExperimentData
} from './queries';
import { getExperimentOverview } from './overview';

const column = (
  id: string,
  name: string,
  role: 'parameter' | 'result',
  kind: 'number' | 'text',
  unit: string | null
) => ({
  id,
  experimentId: 'e1',
  name,
  unit,
  kind,
  role,
  defaultValue: null,
  position: 0
});

const sample = (
  id: string,
  code: string,
  values: Record<string, number | string>,
  extra: Partial<ExperimentData['samples'][number]> = {}
) => ({
  id,
  experimentId: 'e1',
  code,
  performedOn: null,
  values,
  implementation: null,
  observation: null,
  note: null,
  studyIds: [],
  createdAt: new Date(2026, 0, 1),
  ...extra
});

const DATA: ExperimentData = {
  experiment: {
    id: 'e1',
    projectId: 'p1',
    name: 'Deposition',
    codePrefix: 'ALD',
    protocol: 'Pulse the precursor then purge with nitrogen.',
    createdAt: new Date(2026, 0, 1)
  },
  definitions: [
    column('cycles', 'Cycles', 'parameter', 'number', null),
    column('temp', 'Temperature', 'parameter', 'number', '°C'),
    column('sub', 'Substrate', 'parameter', 'text', null),
    column('thick', 'Thickness', 'result', 'number', 'nm')
  ],
  derivedColumns: [
    {
      id: 'rate',
      experimentId: 'e1',
      name: 'Growth rate',
      unit: 'nm/cycle',
      formula: '[#thick] / [#cycles]',
      position: 0
    }
  ],
  studies: [
    {
      id: 's1',
      experimentId: 'e1',
      name: 'Temperature study',
      description: null,
      createdAt: new Date(2026, 0, 1)
    }
  ],
  samples: [
    sample(
      'a',
      'ALD001',
      { cycles: 300, temp: 200, sub: 'Si', thick: 30 },
      {
        studyIds: ['s1'],
        observation: 'Film looked hazy near the edge'
      }
    ),
    sample('b', 'ALD002', { cycles: 600, temp: 250, sub: 'Si', thick: 66 }),
    sample(
      'c',
      'ALD003',
      { cycles: 600, temp: 300, sub: 'Glass' },
      {
        note: 'Reactor serviced before this run'
      }
    ),
    sample('d', 'ALD004', { cycles: 900, sub: 'Si', thick: 90 })
  ],
  characterizations: [
    {
      id: 'c1',
      sampleId: 'b',
      technique: 'SEM',
      measuredOn: '2026-02-01',
      note: null,
      createdAt: new Date(2026, 1, 1)
    }
  ],
  derivedValues: {
    a: { rate: 0.1 },
    b: { rate: 0.11 },
    c: { rate: null },
    d: { rate: 0.1 }
  }
};

type Found = Exclude<ReturnType<typeof findSamples>, { error: string }>;
const codes = (result: ReturnType<typeof findSamples>) =>
  'error' in result ? [] : (result as Found).samples.map(item => item.code);

describe('findSamples', () => {
  it('filters on a number column', () => {
    const result = findSamples(DATA, {
      filters: [{ column: 'cycles', operator: 'eq', value: 600 }]
    });

    expect(codes(result)).toEqual(['ALD002', 'ALD003']);
  });

  it('never counts a sample with no value as a match, and shows it as null', () => {
    const below = findSamples(DATA, {
      filters: [{ column: 'Temperature', operator: 'lt', value: 1000 }]
    });
    expect(codes(below)).toEqual(['ALD001', 'ALD002', 'ALD003']);

    const missing = findSamples(DATA, {
      filters: [{ column: 'Temperature', operator: 'missing' }]
    }) as Found;
    expect(missing.samples).toEqual([
      { code: 'ALD004', values: { Temperature: null }, studies: [] }
    ]);
  });

  it('filters on calculated values and keeps unknown ones out', () => {
    const result = findSamples(DATA, {
      filters: [{ column: 'Growth rate', operator: 'gte', value: 0.1 }]
    });

    expect(codes(result)).toEqual(['ALD001', 'ALD002', 'ALD004']);
  });

  it('sorts with missing values last and shows the sorted column', () => {
    const result = findSamples(DATA, {
      sort: { column: 'Thickness', direction: 'desc' }
    }) as Found;

    expect(result.samples.map(item => item.code)).toEqual([
      'ALD004',
      'ALD002',
      'ALD001',
      'ALD003'
    ]);
    expect(result.samples[3].values.Thickness).toBeNull();
    expect(result.units).toEqual({ Thickness: 'nm' });
  });

  it('filters by study and by text', () => {
    expect(codes(findSamples(DATA, { study: 'temperature study' }))).toEqual([
      'ALD001'
    ]);
    expect(
      codes(
        findSamples(DATA, {
          filters: [{ column: 'Substrate', operator: 'eq', value: 'glass' }]
        })
      )
    ).toEqual(['ALD003']);
  });

  it('explains a mistake instead of guessing', () => {
    expect(
      findSamples(DATA, {
        filters: [{ column: 'Pressure', operator: 'eq', value: 1 }]
      })
    ).toMatchObject({
      error: expect.stringContaining('Pressure'),
      availableColumns: expect.arrayContaining(['Cycles', 'Growth rate'])
    });
    expect(
      findSamples(DATA, {
        filters: [{ column: 'Cycles', operator: 'eq', value: 'lots' }]
      })
    ).toMatchObject({ error: expect.stringContaining('not a number') });
    expect(
      findSamples(DATA, {
        filters: [{ column: 'Substrate', operator: 'gt', value: 'a' }]
      })
    ).toMatchObject({ error: expect.stringContaining('text column') });
    expect(findSamples(DATA, { study: 'Nope' })).toMatchObject({
      error: expect.stringContaining('Nope')
    });
  });

  it('caps the rows and says so', () => {
    const many: ExperimentData = {
      ...DATA,
      samples: Array.from({ length: 80 }, (_, index) =>
        sample(`m${index}`, `ALD${index}`, { cycles: index })
      ),
      derivedValues: {}
    };

    const result = findSamples(many, { limit: 500 }) as Found;
    expect(result.returned).toBe(MAX_TOOL_ROWS);
    expect(result.totalMatches).toBe(80);
    expect(result.isTruncated).toBe(true);
    expect((findSamples(many, {}) as Found).returned).toBe(20);
  });
});

describe('getSample', () => {
  it('lists every column with its unit and null for a missing value', () => {
    const result = getSample(DATA, 'ald004');

    expect(result).toMatchObject({
      code: 'ALD004',
      sources: [
        { label: 'ALD004', path: '/projects/p1/experiments/e1/samples/d' }
      ]
    });
    const columns = (result as { columns: { name: string; value: unknown }[] })
      .columns;
    expect(columns.find(item => item.name === 'Temperature')?.value).toBeNull();
    expect(columns.find(item => item.name === 'Thickness')?.value).toBe(90);
  });

  it('includes measurements and studies', () => {
    expect(getSample(DATA, 'ALD002')).toMatchObject({
      measurements: [{ technique: 'SEM', measuredOn: '2026-02-01', note: null }]
    });
    expect(getSample(DATA, 'ALD001')).toMatchObject({
      studies: ['Temperature study']
    });
  });

  it('reports an unknown code', () => {
    expect(getSample(DATA, 'XYZ')).toEqual({
      error: 'No sample "XYZ" in Deposition.'
    });
  });
});

describe('searchNotes', () => {
  it('finds notes, observations and the protocol, with links', () => {
    const result = searchNotes(DATA, 'service') as {
      matches: { where: string }[];
    };
    expect(result.matches.map(item => item.where)).toEqual(['ALD003']);

    const protocol = searchNotes(DATA, 'purge') as {
      matches: { field: string }[];
    };
    expect(protocol.matches[0].field).toBe('protocol');
  });

  it('rejects an empty search', () => {
    expect(searchNotes(DATA, '  ')).toEqual({
      error: 'The search text is empty.'
    });
  });
});

describe('getExperimentOverview', () => {
  it('summarises what varied, what stayed and the results', () => {
    const overview = getExperimentOverview(DATA);

    expect(overview.varied.map(item => item.name)).toEqual([
      'Cycles',
      'Temperature',
      'Substrate'
    ]);
    expect(
      overview.results.find(item => item.name === 'Thickness')
    ).toMatchObject({
      measuredFor: 3,
      min: 30,
      max: 90
    });
    expect(overview.studies).toEqual([
      { name: 'Temperature study', description: null, sampleCount: 1 }
    ]);
  });
});
