import type { NamedTable } from '@/lib/export/tabular';
import type { ExportTable } from '@/lib/export/types';

import { displayFormula } from '../calculations/formula';
import type {
  Characterization,
  DerivedColumn,
  ParameterDefinition,
  Sample,
  Study
} from '../types';

/** Every word written into the file, already translated, so the file reads in the user's language. */
export type ExportLabels = {
  sheets: {
    samples: string;
    columns: string;
    studies: string;
    measurements: string;
  };
  headers: {
    code: string;
    date: string;
    studies: string;
    implementation: string;
    observation: string;
    note: string;
    name: string;
    unit: string;
    role: string;
    kind: string;
    defaultOrFormula: string;
    study: string;
    description: string;
    sampleCount: string;
    sampleCodes: string;
    sample: string;
    technique: string;
    measuredOn: string;
  };
  roles: { parameter: string; result: string; calculated: string };
  kinds: { number: string; text: string };
};

type ExperimentSheetsInput = {
  definitions: ParameterDefinition[];
  derivedColumns: DerivedColumn[];
  /** Each sample's calculated values: sample id → column id → value (null when it cannot be calculated). */
  derivedValues: Record<string, Record<string, number | null>>;
  /** The samples to export (everything shown, or just the ticked ones). */
  samples: Sample[];
  studies: Study[];
  characterizations: Characterization[];
  labels: ExportLabels;
};

const withUnit = (name: string, unit: string | null) =>
  unit ? `${name} (${unit})` : name;

/**
 * The tables of an experiment export, one per sheet. The samples sheet is the
 * spreadsheet the experiment came from: one row per sample, a column per
 * parameter and result (parameters first, as in the app), then the calculated
 * columns and the notes. Numbers stay numbers and a value that was not
 * recorded is an empty cell, never 0, so the sheet can be calculated on in
 * Excel and imported again.
 */
export const buildExperimentSheets = ({
  definitions,
  derivedColumns,
  derivedValues,
  samples,
  studies,
  characterizations,
  labels
}: ExperimentSheetsInput): NamedTable[] => {
  const entered = [
    ...definitions.filter(item => item.role === 'parameter'),
    ...definitions.filter(item => item.role === 'result')
  ];
  const studyNames = new Map(studies.map(study => [study.id, study.name]));
  const codeById = new Map(samples.map(sample => [sample.id, sample.code]));
  const { headers } = labels;

  const samplesTable: ExportTable = {
    headers: [
      headers.code,
      headers.date,
      headers.studies,
      ...entered.map(item => withUnit(item.name, item.unit)),
      ...derivedColumns.map(item => withUnit(item.name, item.unit)),
      headers.implementation,
      headers.observation,
      headers.note
    ],
    rows: samples.map(sample => [
      sample.code,
      sample.performedOn,
      sample.studyIds
        .map(id => studyNames.get(id))
        .filter(Boolean)
        .join(', '),
      ...entered.map(item => sample.values[item.id] ?? null),
      ...derivedColumns.map(
        item => derivedValues[sample.id]?.[item.id] ?? null
      ),
      sample.implementation,
      sample.observation,
      sample.note
    ])
  };

  const columnsTable: ExportTable = {
    headers: [
      headers.name,
      headers.unit,
      headers.role,
      headers.kind,
      headers.defaultOrFormula
    ],
    rows: [
      ...entered.map(item => [
        item.name,
        item.unit,
        labels.roles[item.role],
        labels.kinds[item.kind],
        item.defaultValue
      ]),
      ...derivedColumns.map(item => [
        item.name,
        item.unit,
        labels.roles.calculated,
        labels.kinds.number,
        displayFormula(item.formula, definitions)
      ])
    ]
  };

  const studiesTable: ExportTable = {
    headers: [
      headers.study,
      headers.description,
      headers.sampleCount,
      headers.sampleCodes
    ],
    rows: studies.map(study => {
      const codes = samples
        .filter(sample => sample.studyIds.includes(study.id))
        .map(sample => sample.code);

      return [study.name, study.description, codes.length, codes.join(', ')];
    })
  };

  const measurementsTable: ExportTable = {
    headers: [
      headers.sample,
      headers.technique,
      headers.measuredOn,
      headers.note
    ],
    rows: characterizations
      .filter(item => codeById.has(item.sampleId))
      .map(item => [
        codeById.get(item.sampleId) ?? '',
        item.technique,
        item.measuredOn,
        item.note
      ])
  };

  return [
    { name: labels.sheets.samples, table: samplesTable },
    { name: labels.sheets.columns, table: columnsTable },
    { name: labels.sheets.studies, table: studiesTable },
    { name: labels.sheets.measurements, table: measurementsTable }
  ];
};
