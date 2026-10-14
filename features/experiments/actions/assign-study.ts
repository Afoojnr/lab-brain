'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getStudyInExperiment } from '../data/studies';
import { assignSamplesToStudy } from '../data/samples';
import { getExperimentInProject } from '../data/experiments';

const sampleIdsSchema = z.array(z.string()).min(1);

/**
 * Tags the chosen samples of an experiment with one of its studies, then
 * refreshes the experiment page. The experiment, study and sample ids are all
 * checked against stored data, never trusted from the client.
 */
export const assignStudyAction = async (
  projectId: string,
  experimentId: string,
  studyId: string,
  sampleIds: unknown
): Promise<number | null> => {
  const parsed = sampleIdsSchema.safeParse(sampleIds);
  if (!parsed.success) return null;
  if (!(await getExperimentInProject(projectId, experimentId))) return null;
  if (!(await getStudyInExperiment(experimentId, studyId))) return null;

  const tagged = await assignSamplesToStudy(experimentId, studyId, parsed.data);
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return tagged;
};
