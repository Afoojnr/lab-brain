'use server';

import { revalidatePath } from 'next/cache';

import { matchTechnique } from '../characterizations';
import {
  getCharacterizationOfSample,
  listTechniquesByProject,
  updateCharacterization
} from '../data/characterizations';
import { getExperimentInProject } from '../data/experiments';
import { getSampleById } from '../data/samples';
import { characterizationFormSchema } from '../schemas';

/**
 * Changes a characterization from the Edit characterization form, then
 * refreshes the sample and experiment pages. The technique is respelled to the
 * project's existing spelling; invalid input only comes from a direct call,
 * so it is ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample the record belongs to.
 * @param characterizationId - The record to change.
 * @param input - Raw form values.
 * @returns Whether the characterization was changed.
 */
export const updateCharacterizationAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  characterizationId: string,
  input: unknown
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;
  if ((await getSampleById(sampleId))?.experimentId !== experimentId) {
    return false;
  }
  if (!(await getCharacterizationOfSample(sampleId, characterizationId))) {
    return false;
  }

  const parsed = characterizationFormSchema.safeParse(input);
  if (!parsed.success) return false;

  const known = await listTechniquesByProject(projectId);
  const updated = await updateCharacterization(sampleId, characterizationId, {
    ...parsed.data,
    technique: matchTechnique(parsed.data.technique, known)
  });
  if (!updated) return false;

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}`
  );

  return true;
};
