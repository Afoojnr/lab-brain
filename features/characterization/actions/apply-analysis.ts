'use server';

import { revalidatePath } from 'next/cache';

import {
  createParameterDefinition,
  getCharacterizationOfSample,
  getExperimentInProject,
  getSampleById,
  listDatasetsByCharacterization,
  listParameterDefinitions,
  updateSample
} from '@/features/experiments/server';
import { buildParameterFormSchema } from '@/features/experiments/shared';
import type { ParameterValues } from '@/features/experiments/shared';

import { saveAnalysis } from '../data/analyses';
import { computeAnalysisValues } from '../load';
import { analysisKindSchema, analysisSettingsSchema } from '../schemas';

/**
 * Sends the chosen analysis values to the sample's result columns. Nothing the
 * browser says about the numbers is used: the values are computed again here
 * from the stored files and the settings, and every target is checked against
 * the experiment's own columns (an existing number result column, or a new
 * result column with a valid, unused name). Only the chosen columns change;
 * every other value of the sample is kept. Invalid input only comes from a
 * direct call, so it is ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample to update.
 * @param characterizationId - The characterization analysed.
 * @param kind - Which analysis.
 * @param input - The settings: which values go to which columns.
 * @returns How many values were written, or null when ignored.
 */
export const applyAnalysisAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  characterizationId: string,
  kind: unknown,
  input: unknown
): Promise<number | null> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return null;
  const sample = await getSampleById(sampleId);
  if (sample?.experimentId !== experimentId) return null;
  if (!(await getCharacterizationOfSample(sampleId, characterizationId)))
    return null;

  const parsedKind = analysisKindSchema.safeParse(kind);
  const parsed = analysisSettingsSchema.safeParse(input);
  if (!parsedKind.success || !parsed.success) return null;
  const settings = parsed.data;

  const [datasets, definitions] = await Promise.all([
    listDatasetsByCharacterization(characterizationId),
    listParameterDefinitions(experimentId)
  ]);
  const values = await computeAnalysisValues(
    parsedKind.data,
    datasets,
    settings
  );
  if (!values || settings.selectedValueIds.length === 0) return null;

  // Check every target before anything is written.
  const names = definitions.map(definition => definition.name);
  const plan: {
    valueId: string;
    columnId?: string;
    newColumn?: { name: string; unit: string };
  }[] = [];
  const usedColumns = new Set<string>();
  for (const valueId of settings.selectedValueIds) {
    const target = settings.targets[valueId];
    if (!values.some(value => value.id === valueId) || !target) return null;

    if (target.type === 'column') {
      const column = definitions.find(
        definition => definition.id === target.columnId
      );
      if (!column || column.role !== 'result' || column.kind !== 'number')
        return null;
      if (usedColumns.has(column.id)) return null;
      usedColumns.add(column.id);
      plan.push({ valueId, columnId: column.id });
      continue;
    }

    const form = buildParameterFormSchema(names).safeParse({
      name: target.name,
      unit: target.unit,
      kind: 'number',
      role: 'result',
      defaultValue: ''
    });
    if (!form.success) return null;
    names.push(form.data.name);
    plan.push({
      valueId,
      newColumn: { name: form.data.name, unit: form.data.unit }
    });
  }

  const merged: ParameterValues = { ...sample.values };
  for (const item of plan) {
    const value = values.find(
      candidate => candidate.id === item.valueId
    )?.value;
    if (value === undefined || !Number.isFinite(value)) return null;

    const columnId =
      item.columnId ??
      (
        await createParameterDefinition(experimentId, {
          name: item.newColumn?.name ?? '',
          unit: item.newColumn?.unit ?? '',
          kind: 'number',
          role: 'result',
          defaultValue: null
        })
      ).id;
    merged[columnId] = value;
  }

  await updateSample(experimentId, sampleId, {
    code: sample.code,
    performedOn: sample.performedOn,
    values: merged,
    studyIds: sample.studyIds,
    implementation: sample.implementation,
    observation: sample.observation,
    note: sample.note
  });
  await saveAnalysis(characterizationId, parsedKind.data, settings);
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}`
  );
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}/characterizations/${characterizationId}`
  );

  return plan.length;
};
