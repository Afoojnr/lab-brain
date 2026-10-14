'use server';

import { revalidatePath } from 'next/cache';

import {
  getExperimentInProject,
  listCharacterizationsByExperiment,
  listDatasetsByCharacterization,
  listParameterDefinitions,
  listSamplesByExperiment,
  updateSample
} from '@/features/experiments/server';
import type { ParameterValues } from '@/features/experiments/shared';

import { saveAnalysis } from '../data/analyses';
import { computeAnalysisValues } from '../analysis/load';
import { analysisKindSchema, batchPayloadSchema } from '../schemas';
import { createPlannedColumns, numbersFor, planTargets } from './apply-core';

/**
 * Sends analysis values to the result columns of several samples of one
 * experiment. The numbers are computed again here from the stored files, never
 * taken from the browser, and every characterization must belong to the
 * experiment.
 */
export const applyAnalysisBatchAction = async (
  projectId: string,
  experimentId: string,
  kind: unknown,
  input: unknown
): Promise<number | null> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return null;

  const parsedKind = analysisKindSchema.safeParse(kind);
  const parsed = batchPayloadSchema.safeParse(input);
  if (!parsedKind.success || !parsed.success) return null;
  const { settings, rows } = parsed.data;
  if (rows.length === 0) return null;

  const [definitions, samples, characterizations] = await Promise.all([
    listParameterDefinitions(experimentId),
    listSamplesByExperiment(experimentId),
    listCharacterizationsByExperiment(experimentId)
  ]);

  // Every row is a characterization of this experiment, one per sample.
  const seenSamples = new Set<string>();
  const targets = [];
  for (const row of rows) {
    const characterization = characterizations.find(
      item => item.id === row.characterizationId
    );
    const sample = samples.find(item => item.id === characterization?.sampleId);
    if (!characterization || !sample || seenSamples.has(sample.id)) return null;
    seenSamples.add(sample.id);

    const rowSettings = {
      ...settings,
      excludedSpots: row.excludedSpots,
      datasetId: null
    };
    const values = await computeAnalysisValues(
      parsedKind.data,
      await listDatasetsByCharacterization(characterization.id),
      rowSettings
    );
    if (!values) return null;
    targets.push({ characterization, sample, rowSettings, values });
  }

  // Check the targets and every number before anything is written.
  const plan = planTargets(
    settings.selectedValueIds,
    settings.targets,
    targets[0]?.values.map(value => value.id) ?? [],
    definitions
  );
  if (!plan) return null;
  const allNumbers = targets.map(item => numbersFor(plan, item.values));
  if (allNumbers.some(numbers => numbers === null)) return null;

  const columnIds = await createPlannedColumns(experimentId, plan);
  for (const [index, item] of targets.entries()) {
    const merged: ParameterValues = { ...item.sample.values };
    for (const planned of plan) {
      const columnId = columnIds.get(planned.valueId);
      const number = allNumbers[index]?.get(planned.valueId);
      if (columnId !== undefined && number !== undefined) {
        merged[columnId] = number;
      }
    }

    await updateSample(experimentId, item.sample.id, {
      code: item.sample.code,
      performedOn: item.sample.performedOn,
      values: merged,
      studyIds: item.sample.studyIds,
      implementation: item.sample.implementation,
      observation: item.sample.observation,
      note: item.sample.note
    });
    await saveAnalysis(
      item.characterization.id,
      parsedKind.data,
      item.rowSettings
    );
  }

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  revalidatePath(
    '/projects/[projectId]/experiments/[experimentId]/samples/[sampleId]',
    'page'
  );
  revalidatePath(`/characterization/${parsedKind.data}`);

  return targets.length;
};
