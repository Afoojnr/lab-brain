import { describe, expect, it } from 'vitest';

import { buildExperimentSheets } from './export-workbook';
import type { ExportLabels } from './export-workbook';
import type {
  Characterization,
  DerivedColumn,
  ParameterDefinition,
  Sample,
  Study
} from '../types';

const LABELS: ExportLabels = {
  sheets: {
    samples: 'Samples',
    columns: 'Columns',
    studies: 'Studies',
    measurements: 'Measurements'
  },
  headers: {
    code: 'Sample',
    date: 'Date',
    studies: 'Studies',
    implementation: 'Implementation',
    observation: 'Observation',
    note: 'Note',
    name: 'Name',
    unit: 'Unit',
    role: 'Role',
    kind: 'Kind',
    defaultOrFormula: 'Default or formula',
    study: 'Study',
    description: 'Description',
    sampleCount: 'Samples',
    sampleCodes: 'Sample codes',
    sample: 'Sample',
    technique: 'Technique',
    measuredOn: 'Measured on'
  },
  roles: { parameter: 'Parameter', result: 'Result', calculated: 'Calculated' },
  kinds: { number: 'Number', text: 'Text' }
};

const definition = (
  id: string,
  name: string,
  unit: string | null,
  role: 'parameter' | 'result',
  kind: 'number' | 'text' = 'number',
  position = 0
): ParameterDefinition => ({
  id,
  experimentId: 'e',
  name,
  unit,
  kind,
  role,
  defaultValue: null,
  position
});

// A result is listed before a parameter on purpose: the export puts parameters first.
const DEFINITIONS = [
  definition('thick', 'Thickness', 'nm', 'result'),
  definition('temp', 'Temperature', '°C', 'parameter'),
  definition('sub', 'Substrate', null, 'parameter', 'text')
];
const DERIVED: DerivedColumn[] = [
  {
    id: 'gpc',
    experimentId: 'e',
    name: 'GPC',
    unit: 'Å/cycle',
    formula: '[#thick] * 10 / [#temp]',
    position: 0
  }
];
const sample = (
  id: string,
  code: string,
  values: Sample['values'],
  studyIds: string[] = []
): Sample => ({
  id,
  experimentId: 'e',
  code,
  performedOn: '2026-09-04',
  values,
  implementation: 'why',
  observation: null,
  note: null,
  studyIds,
  createdAt: new Date()
});
const SAMPLES = [
  sample('s1', 'ALD001', { thick: 40.5, temp: 200, sub: 'Si' }, ['st1']),
  sample('s2', 'ALD002', { temp: 150 })
];
const STUDIES: Study[] = [
  {
    id: 'st1',
    experimentId: 'e',
    name: 'Pulse',
    description: null,
    createdAt: new Date()
  }
];
const CHARACTERIZATIONS: Characterization[] = [
  {
    id: 'c1',
    sampleId: 's1',
    technique: 'EDX',
    measuredOn: '2026-09-10',
    note: null,
    createdAt: new Date()
  },
  {
    id: 'c2',
    sampleId: 'other',
    technique: 'SEM',
    measuredOn: null,
    note: null,
    createdAt: new Date()
  }
];

const build = (samples = SAMPLES) =>
  buildExperimentSheets({
    definitions: DEFINITIONS,
    derivedColumns: DERIVED,
    derivedValues: { s1: { gpc: 10.125 }, s2: { gpc: null } },
    samples,
    studies: STUDIES,
    characterizations: CHARACTERIZATIONS,
    labels: LABELS
  });

describe('buildExperimentSheets', () => {
  it('writes the sheets in order', () => {
    expect(build().map(sheet => sheet.name)).toEqual([
      'Samples',
      'Columns',
      'Studies',
      'Measurements'
    ]);
  });

  it('puts parameters before results, then calculated columns and notes, with units in the headers', () => {
    expect(build()[0].table.headers).toEqual([
      'Sample',
      'Date',
      'Studies',
      'Temperature (°C)',
      'Substrate',
      'Thickness (nm)',
      'GPC (Å/cycle)',
      'Implementation',
      'Observation',
      'Note'
    ]);
  });

  it('keeps numbers as numbers and leaves a value that was not recorded empty, never 0', () => {
    const [first, second] = build()[0].table.rows;

    expect(first).toEqual([
      'ALD001',
      '2026-09-04',
      'Pulse',
      200,
      'Si',
      40.5,
      10.125,
      'why',
      null,
      null
    ]);
    expect(second.slice(3, 7)).toEqual([150, null, null, null]);
  });

  it('describes the columns, with the formula written by column name', () => {
    const rows = build()[1].table.rows;

    expect(rows[0]).toEqual(['Temperature', '°C', 'Parameter', 'Number', null]);
    expect(rows.at(-1)).toEqual([
      'GPC',
      'Å/cycle',
      'Calculated',
      'Number',
      '[Thickness] * 10 / [Temperature]'
    ]);
  });

  it('lists studies with the codes of the exported samples, and only their measurements', () => {
    const only = build([SAMPLES[1]]);

    expect(only[2].table.rows).toEqual([['Pulse', null, 0, '']]);
    expect(only[3].table.rows).toEqual([]);
    expect(build()[2].table.rows).toEqual([['Pulse', null, 1, 'ALD001']]);
    expect(build()[3].table.rows).toEqual([
      ['ALD001', 'EDX', '2026-09-10', null]
    ]);
  });
});
