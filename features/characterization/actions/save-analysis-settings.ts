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
 * Saves what the user chose in an analysis (spots left out, the ratio pair, the
 * values and where they go), so it is there next time. Invalid input only comes
 * from a direct call, so it is ignored.
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
