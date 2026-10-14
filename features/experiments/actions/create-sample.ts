'use server';

import { revalidatePath } from 'next/cache';

import { listParameterDefinitions } from '../data/parameter-definitions';
import { createSample, listSampleCodesByProject } from '../data/samples';
import { getExperimentInProject } from '../data/experiments';
import { listStudiesByExperiment } from '../data/studies';
import { buildSampleFormSchema, toSampleInput } from '../schemas/schemas';

/**
 * Records a sample from the Add sample form. The schema is rebuilt from the
 * stored columns and codes, never from the browser, so a number column rejects
 * text and a code is never reused. Invalid input is ignored.
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
