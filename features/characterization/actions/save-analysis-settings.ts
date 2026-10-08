'use server';

import { revalidatePath } from 'next/cache';

import {
  getCharacterizationOfSample,
  getExperimentInProject,
  getSampleById
} from '@/features/experiments/server';

import { saveAnalysis } from '../data/analyses';
import { analysisKindSchema, analysisSettingsSchema } from '../schemas';

/**
 * Saves what the user chose in an analysis (spots left out, the ratio pair,
 * the values and where they go), so it is there next time. Nothing is
 * written to the sample. Invalid input only comes from a direct call, so it is
 * ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample the characterization belongs to.
 * @param characterizationId - The characterization analysed.
 * @param kind - Which analysis.
 * @param input - The settings.
 * @returns Whether they were saved.
 */
export const saveAnalysisSettingsAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  characterizationId: string,
  kind: unknown,
  input: unknown
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;
  if ((await getSampleById(sampleId))?.experimentId !== experimentId)
    return false;
  if (!(await getCharacterizationOfSample(sampleId, characterizationId)))
    return false;

  const parsedKind = analysisKindSchema.safeParse(kind);
  const parsed = analysisSettingsSchema.safeParse(input);
  if (!parsedKind.success || !parsed.success) return false;

  await saveAnalysis(characterizationId, parsedKind.data, parsed.data);
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}/characterizations/${characterizationId}`
  );

  return true;
};
