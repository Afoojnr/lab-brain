import { calculateForSamples } from '@/features/experiments/shared';
import {
  listDerivedColumns,
  listParameterDefinitions,
  listSamplesByExperiment,
  listStudiesByExperiment
} from '@/features/experiments/server';

import type { PlotTable } from './from-table';
import type { PlotColumn, PlotRow } from '../types';

const DERIVED_PREFIX = 'derived:';

/**
 * An experiment's samples as a table to plot: its columns of numbers (entered
 * and calculated) and of text, one row per sample with the studies it is in.
 * A value that is not recorded, or a calculated one that cannot be worked out,
 * is absent from the row, never 0.
 */
export const loadExperimentTable = async (
  projectId: string,
  experimentId: string,
  sampleIds?: string[]
): Promise<PlotTable> => {
  const [definitions, derivedColumns, allSamples, studies] = await Promise.all([
    listParameterDefinitions(experimentId),
    listDerivedColumns(experimentId),
    listSamplesByExperiment(experimentId),
    listStudiesByExperiment(experimentId)
  ]);
  const samples = sampleIds
    ? allSamples.filter(sample => sampleIds.includes(sample.id))
    : allSamples;
  const studyNames = new Map(studies.map(study => [study.id, study.name]));
  const calculated = calculateForSamples(definitions, derivedColumns, samples);

  const columns: PlotColumn[] = [
    ...definitions.map(definition => ({
      key: definition.id,
      name: definition.name,
      unit: definition.unit,
      kind: definition.kind,
      role: definition.role
    })),
    ...derivedColumns.map(derived => ({
      key: `${DERIVED_PREFIX}${derived.id}`,
      name: derived.name,
      unit: derived.unit,
      kind: 'number' as const,
      role: 'calculated' as const
    }))
  ];

  const rows = samples.map((sample): PlotRow => {
    const values: PlotRow['values'] = { ...sample.values };
    for (const derived of derivedColumns) {
      const value = calculated[sample.id]?.[derived.id] ?? null;
      if (value !== null) values[`${DERIVED_PREFIX}${derived.id}`] = value;
    }

    return {
      id: sample.id,
      label: sample.code,
      href: `/projects/${projectId}/experiments/${experimentId}/samples/${sample.id}`,
      values,
      groups: sample.studyIds.flatMap(id => studyNames.get(id) ?? [])
    };
  });

  return { columns, rows };
};
