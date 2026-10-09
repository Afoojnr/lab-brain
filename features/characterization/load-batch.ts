import {
  listCharacterizationsByExperiment,
  listDatasetsByCharacterization,
  listSamplesByExperiment
} from '@/features/experiments/server';

import type { BatchRow } from './batch-types';
import { getAnalysis } from './data/analyses';
import { suggestKind } from './defaults';
import { loadEdxSpots, loadSeqfits } from './load';
import type { AnalysisKind } from './types';

/**
 * The rows of a batch: an experiment's characterizations whose technique is
 * this kind of analysis, each with what its files say and what its sample holds
 * now. A repeat is its own row. EDX spectra are left out to keep it light.
 *
 * @param kind - Which analysis.
 * @param experimentId - The experiment to list.
 */
export const loadBatchRows = async (
  kind: AnalysisKind,
  experimentId: string
): Promise<BatchRow[]> => {
  const [characterizations, samples] = await Promise.all([
    listCharacterizationsByExperiment(experimentId),
    listSamplesByExperiment(experimentId)
  ]);

  const rows = await Promise.all(
    characterizations
      .filter(item => suggestKind(item.technique) === kind)
      .map(async (item): Promise<BatchRow | null> => {
        const sample = samples.find(
          candidate => candidate.id === item.sampleId
        );
        if (!sample) return null;

        const datasets = await listDatasetsByCharacterization(item.id);
        const base = {
          characterizationId: item.id,
          sampleId: sample.id,
          sampleCode: sample.code,
          measuredOn: item.measuredOn,
          technique: item.technique,
          currentValues: sample.values
        };

        if (kind === 'edx') {
          const { spots, problems } = await loadEdxSpots(datasets, {
            withSpectra: false
          });
          const saved = await getAnalysis(item.id, 'edx');

          return {
            ...base,
            edx: {
              spots,
              problems,
              excludedSpots: saved?.settings.excludedSpots ?? []
            },
            ellipsometry: null
          };
        }

        const files = await loadSeqfits(datasets);
        const readable = files.find(file => file.summary);

        return {
          ...base,
          edx: null,
          ellipsometry: {
            summary: readable?.summary ?? null,
            reason: readable
              ? null
              : files.length === 0
                ? 'noFile'
                : 'notSeqfit'
          }
        };
      })
  );

  return rows
    .filter((row): row is BatchRow => row !== null)
    .sort(
      (a, b) =>
        a.sampleCode.localeCompare(b.sampleCode, undefined, {
          numeric: true
        }) || (a.measuredOn ?? '').localeCompare(b.measuredOn ?? '')
    );
};
