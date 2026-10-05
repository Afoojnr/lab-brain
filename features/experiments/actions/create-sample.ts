'use server';

import { revalidatePath } from 'next/cache';

import { listParameterDefinitions } from '../data/parameter-definitions';
import { createSample, listSampleCodesByProject } from '../data/samples';
import { getExperimentInProject } from '../data/experiments';
import { listStudiesByExperiment } from '../data/studies';
import { buildSampleFormSchema, toSampleInput } from '../schemas';

/**
 * Records a sample from the Add sample form, then refreshes the experiment page.
 * The schema is rebuilt here from the experiment's own stored columns and the
 * project's stored codes, never from anything the browser sends, so a number
 * column always rejects text and a code is never reused. Invalid input only
 * comes from a direct call, so it is ignored.
 *
 * @param projectId - Owning project's id.
 * @param experimentId - The experiment the sample belongs to.
 * @param input - Raw form values.
 * @returns The new sample's id and code, or null when ignored.
 */
export const createSampleAction = async (
  projectId: string,
  experimentId: string,
  input: unknown
): Promise<{ id: string; code: string } | null> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return null;

  const [definitions, codes, studies] = await Promise.all([
    listParameterDefinitions(experimentId),
    listSampleCodesByProject(projectId),
    listStudiesByExperiment(experimentId)
  ]);
  const parsed = buildSampleFormSchema(definitions, codes).safeParse(input);
  if (!parsed.success) return null;

  const sample = await createSample(
    experimentId,
    toSampleInput(definitions, studies, parsed.data)
  );
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return { id: sample.id, code: sample.code };
};
