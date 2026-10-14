import {
  listCharacterizationsByExperiment,
  listDatasetsByCharacterization,
  listSamplesByExperiment
} from '@/features/experiments/server';

import { suggestKind } from '../analysis/defaults';
import { loadFtirSpectra } from '../analysis/load';
import type { FtirBatchRow } from './batch-types';

/**
 * The rows of an FTIR comparison: an experiment's characterizations whose
 * technique is FTIR, each with its first readable spectrum (null when it has
 * none).
 */
export const loadFtirBatchRows = async (
  experimentId: string
): Promise<FtirBatchRow[]> => {
  const [characterizations, samples] = await Promise.all([
    listCharacterizationsByExperiment(experimentId),
    listSamplesByExperiment(experimentId)
  ]);

  const rows = await Promise.all(
    characterizations
      .filter(item => suggestKind(item.technique) === 'ftir')
      .map(async (item): Promise<FtirBatchRow | null> => {
        const sample = samples.find(
          candidate => candidate.id === item.sampleId
        );
        if (!sample) return null;

        const files = await loadFtirSpectra(
          await listDatasetsByCharacterization(item.id)
        );

        return {
          characterizationId: item.id,
          sampleId: sample.id,
          sampleCode: sample.code,
          measuredOn: item.measuredOn,
          technique: item.technique,
          currentValues: sample.values,
          points: files.find(file => file.points)?.points ?? null
        };
      })
  );

  return rows
    .filter((row): row is FtirBatchRow => row !== null)
    .sort(
      (a, b) =>
        a.sampleCode.localeCompare(b.sampleCode, undefined, {
          numeric: true
        }) || (a.measuredOn ?? '').localeCompare(b.measuredOn ?? '')
    );
};
