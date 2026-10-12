import type {
  DerivedColumn,
  ParameterDefinition,
  ParameterValue,
  Sample
} from '@/features/experiments/shared';

export type VariedColumn = {
  id: string;
  name: string;
  unit: string | null;
  kind: 'number' | 'text';
  /** Each distinct value the samples have, numbers ascending and text A to Z. */
  values: ParameterValue[];
  /** The lowest and highest, for a number column; null for text. */
  min: number | null;
  max: number | null;
  /** How many samples have a value for it. */
  recorded: number;
};

export type ConstantColumn = {
  id: string;
  name: string;
  unit: string | null;
  value: ParameterValue;
  /** How many samples have this value (the others have none recorded). */
  recorded: number;
};

export type ResultSummary = {
  id: string;
  name: string;
  unit: string | null;
  /** How many samples have a value (measured, or calculated where it can be). */
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  /** Standard deviation dividing by N, as the EDX rules do; null with fewer than two values. */
  sd: number | null;
};

export type ExperimentSummaryData = {
  sampleCount: number;
  varied: VariedColumn[];
  constant: ConstantColumn[];
  results: ResultSummary[];
};

const compare = (a: ParameterValue, b: ParameterValue) =>
  typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a).localeCompare(String(b), undefined, { numeric: true });

const statistics = (values: number[]) => {
  if (values.length === 0)
    return { min: null, max: null, mean: null, sd: null };

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean,
    sd: values.length > 1 ? Math.sqrt(variance) : null
  };
};

/**
 * What an experiment says, without repeating its table: which settings changed
 * between samples (and over what values), which stayed the same, and how each
 * result came out across the samples. A sample with no value for a column is
 * left out of that column's numbers, never counted as 0.
 *
 * @param input - The experiment's columns, the samples and their calculated values.
 */
export const summarizeExperiment = ({
  definitions,
  derivedColumns,
  derivedValues,
  samples
}: {
  definitions: ParameterDefinition[];
  derivedColumns: Pick<DerivedColumn, 'id' | 'name' | 'unit'>[];
  derivedValues: Record<string, Record<string, number | null>>;
  samples: Pick<Sample, 'id' | 'values'>[];
}): ExperimentSummaryData => {
  const varied: VariedColumn[] = [];
  const constant: ConstantColumn[] = [];

  for (const column of definitions.filter(item => item.role === 'parameter')) {
    const recordedValues = samples.flatMap(sample => {
      const value = sample.values[column.id];
      return value === undefined ? [] : [value];
    });
    const distinct = [...new Set(recordedValues)].sort(compare);
    if (distinct.length === 0) continue;

    if (distinct.length === 1) {
      constant.push({
        id: column.id,
        name: column.name,
        unit: column.unit,
        value: distinct[0],
        recorded: recordedValues.length
      });
      continue;
    }

    const numbers = distinct.filter(
      (value): value is number => typeof value === 'number'
    );
    varied.push({
      id: column.id,
      name: column.name,
      unit: column.unit,
      kind: column.kind,
      values: distinct,
      min: column.kind === 'number' ? Math.min(...numbers) : null,
      max: column.kind === 'number' ? Math.max(...numbers) : null,
      recorded: recordedValues.length
    });
  }

  const resultOf = (
    id: string,
    name: string,
    unit: string | null,
    values: number[]
  ): ResultSummary => ({
    id,
    name,
    unit,
    count: values.length,
    ...statistics(values)
  });
  const results: ResultSummary[] = [
    ...definitions
      .filter(item => item.role === 'result' && item.kind === 'number')
      .map(column =>
        resultOf(
          column.id,
          column.name,
          column.unit,
          samples.flatMap(sample => {
            const value = sample.values[column.id];
            return typeof value === 'number' ? [value] : [];
          })
        )
      ),
    ...derivedColumns.map(column =>
      resultOf(
        column.id,
        column.name,
        column.unit,
        samples.flatMap(sample => {
          const value = derivedValues[sample.id]?.[column.id];
          return value === null || value === undefined ? [] : [value];
        })
      )
    )
  ];

  return { sampleCount: samples.length, varied, constant, results };
};
