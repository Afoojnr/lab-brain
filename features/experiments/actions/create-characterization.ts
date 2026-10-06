'use server';

import { revalidatePath } from 'next/cache';

import { matchTechnique } from '../characterizations';
import {
  createCharacterization,
  listTechniquesByProject
} from '../data/characterizations';
import { getExperimentInProject } from '../data/experiments';
import { getSampleById } from '../data/samples';
import { characterizationFormSchema } from '../schemas';

/**
 * Records a characterization on a sample from the Add characterization form,
 * then refreshes the sample and experiment pages. The technique is respelled
 * on the server to the project's existing spelling, so "eds" never becomes a
 * second "EDS"; invalid input only comes from a direct call, so it is ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample that was measured.
 * @param input - Raw form values.
 * @returns Whether a characterization was added.
 */
export const createCharacterizationAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  input: unknown
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;
  if ((await getSampleById(sampleId))?.experimentId !== experimentId) {
    return false;
  }

  const parsed = characterizationFormSchema.safeParse(input);
  if (!parsed.success) return false;

  const known = await listTechniquesByProject(projectId);
  await createCharacterization(sampleId, {
    ...parsed.data,
    technique: matchTechnique(parsed.data.technique, known)
  });
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}`
  );

  return true;
};
