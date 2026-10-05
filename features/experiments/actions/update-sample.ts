'use server';

import { revalidatePath } from 'next/cache';

import { listParameterDefinitions } from '../data/parameter-definitions';
import {
  getSampleById,
  listSampleCodesByProject,
  updateSample
} from '../data/samples';
import { getExperimentInProject } from '../data/experiments';
import { listStudiesByExperiment } from '../data/studies';
import { buildSampleFormSchema, toSampleInput } from '../schemas';

/**
 * Changes a sample from the Edit sample form, then refreshes the pages that
 * show it. The schema is rebuilt here from the stored columns and codes; the
 * sample's own current code does not count as a duplicate. Invalid input only
 * comes from a direct call, so it is ignored.
 *
 * @param projectId - Owning project's id.
 * @param experimentId - The experiment the sample belongs to.
 * @param sampleId - The sample to change.
 * @param input - Raw form values.
 * @returns The sample's id and code, or null when ignored or not found.
 */
export const updateSampleAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  input: unknown
): Promise<{ id: string; code: string } | null> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return null;

  const current = await getSampleById(sampleId);
  if (current?.experimentId !== experimentId) return null;

  const [definitions, codes, studies] = await Promise.all([
    listParameterDefinitions(experimentId),
    listSampleCodesByProject(projectId),
    listStudiesByExperiment(experimentId)
  ]);
  const otherCodes = codes.filter(
    code => code.toLowerCase() !== current.code.toLowerCase()
  );
  const parsed = buildSampleFormSchema(definitions, otherCodes).safeParse(
    input
  );
  if (!parsed.success) return null;

  const sample = await updateSample(
    experimentId,
    sampleId,
    toSampleInput(definitions, studies, parsed.data)
  );
  if (!sample) return null;

  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
  revalidatePath(
    `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}`
  );

  return { id: sample.id, code: sample.code };
};
