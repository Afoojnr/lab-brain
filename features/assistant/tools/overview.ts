import { summarizeExperiment } from '@/features/experiments/shared';

import {
  clip,
  experimentSource,
  columnsOf,
  type ExperimentData
} from './queries';

/** Longest list of distinct values written out for one varied column. */
const MAX_LISTED_VALUES = 12;

/**
 * What one experiment is, in a few hundred tokens: its protocol (cut), its
 * columns, studies, which settings varied or stayed the same and how each result
 * came out. The table itself stays out; findSamples reads rows.
 *
 * @param data - The experiment.
 */
export const getExperimentOverview = (data: ExperimentData) => {
  const summary = summarizeExperiment({
    definitions: data.definitions,
    derivedColumns: data.derivedColumns,
    derivedValues: data.derivedValues,
    samples: data.samples
  });

  return {
    experiment: data.experiment.name,
    codePrefix: data.experiment.codePrefix,
    protocol: data.experiment.protocol && clip(data.experiment.protocol, 1500),
    sampleCount: summary.sampleCount,
    columns: columnsOf(data).map(column => ({
      name: column.name,
      kind: column.role,
      unit: column.unit
    })),
    studies: data.studies.map(study => ({
      name: study.name,
      description: study.description && clip(study.description),
      sampleCount: data.samples.filter(sample =>
        sample.studyIds.includes(study.id)
      ).length
    })),
    varied: summary.varied.map(column => ({
      name: column.name,
      unit: column.unit,
      min: column.min,
      max: column.max,
      recordedFor: column.recorded,
      values: column.values.slice(0, MAX_LISTED_VALUES),
      hasMoreValues: column.values.length > MAX_LISTED_VALUES
    })),
    constant: summary.constant.map(column => ({
      name: column.name,
      unit: column.unit,
      value: column.value,
      recordedFor: column.recorded
    })),
    results: summary.results.map(result => ({
      name: result.name,
      unit: result.unit,
      measuredFor: result.count,
      min: result.min,
      max: result.max,
      mean: result.mean,
      sd: result.sd
    })),
    sources: [experimentSource(data.experiment.projectId, data.experiment)]
  };
};
