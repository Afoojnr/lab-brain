import { describe, expect, it } from 'vitest';

import { summarizeExperiment } from './summary';

const column = (
  id: string,
  name: string,
  role: 'parameter' | 'result',
  kind: 'number' | 'text' = 'number',
  unit: string | null = null
) => ({
  id,
  experimentId: 'e',
  name,
  unit,
  kind,
  role,
  defaultValue: null,
  position: 0
});

const DEFINITIONS = [
  column('temp', 'Temperature', 'parameter', 'number', '°C'),
  column('purge', 'Purge', 'parameter', 'number', 's'),
  column('sub', 'Substrate', 'parameter', 'text'),
  column('never', 'Never set', 'parameter'),
  column('thick', 'Thickness', 'result', 'number', 'nm'),
  column('note', 'Comment', 'result', 'text')
];
const SAMPLES: { id: string; values: Record<string, number | string> }[] = [
  { id: 'a', values: { temp: 200, purge: 10, sub: 'Si', thick: 40 } },
  { id: 'b', values: { temp: 150, purge: 10, sub: 'Si', thick: 50 } },
  { id: 'c', values: { temp: 250, purge: 10, sub: 'Glass' } },
  { id: 'd', values: { temp: 200 } }
];

const summary = summarizeExperiment({
  definitions: DEFINITIONS,
  derivedColumns: [{ id: 'gpc', name: 'GPC', unit: 'Å/cycle' }],
  derivedValues: { a: { gpc: 1 }, b: { gpc: null }, c: {}, d: { gpc: 3 } },
  samples: SAMPLES
});

describe('summarizeExperiment', () => {
  it('lists a setting that changed with its values and range, counting only recorded values', () => {
    const temperature = summary.varied.find(item => item.id === 'temp');

    expect(temperature).toMatchObject({
      values: [150, 200, 250],
      min: 150,
      max: 250,
      recorded: 4
    });
  });

  it('lists text settings that changed without a range', () => {
    expect(summary.varied.find(item => item.id === 'sub')).toMatchObject({
      values: ['Glass', 'Si'],
      min: null,
      max: null,
      recorded: 3
    });
  });

  it('lists a setting that never changed once, with how many samples recorded it', () => {
    expect(summary.constant).toEqual([
      { id: 'purge', name: 'Purge', unit: 's', value: 10, recorded: 3 }
    ]);
  });

  it('leaves out a setting no sample recorded', () => {
    expect(summary.varied.some(item => item.id === 'never')).toBe(false);
    expect(summary.constant.some(item => item.id === 'never')).toBe(false);
  });

  it('summarises number results and calculated columns, never counting a missing value as 0', () => {
    const thickness = summary.results.find(item => item.id === 'thick');

    expect(thickness).toMatchObject({ count: 2, min: 40, max: 50, mean: 45 });
    expect(thickness?.sd).toBeCloseTo(5, 10); // population standard deviation (divides by N)
    const gpc = summary.results.find(item => item.id === 'gpc');
    expect(gpc).toMatchObject({ count: 2, min: 1, max: 3, mean: 2 });
  });

  it('skips a text result and gives no spread for fewer than two values', () => {
    expect(summary.results.some(item => item.id === 'note')).toBe(false);
    const one = summarizeExperiment({
      definitions: [column('t', 'T', 'result')],
      derivedColumns: [],
      derivedValues: {},
      samples: [{ id: 'a', values: { t: 7 } }]
    });

    expect(one.results[0]).toMatchObject({ count: 1, mean: 7, sd: null });
  });

  it('reports a result nobody measured as 0 values, with nothing to show', () => {
    const none = summarizeExperiment({
      definitions: [column('t', 'T', 'result')],
      derivedColumns: [],
      derivedValues: {},
      samples: [{ id: 'a', values: {} }]
    });

    expect(none.results[0]).toEqual({
      id: 't',
      name: 'T',
      unit: null,
      count: 0,
      min: null,
      max: null,
      mean: null,
      sd: null
    });
  });
});
