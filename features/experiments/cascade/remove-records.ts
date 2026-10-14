import { getStorage } from '@/lib/storage';

import { deleteCharacterizationsOfSample } from '../data/characterizations';
import { deleteDerivedColumnsOfExperiment } from '../data/derived-columns';
import { deleteDatasetsOfCharacterization } from '../data/datasets';
import {
  deleteExperiment,
  getExperimentInProject,
  listExperimentsByProject
} from '../data/experiments';
import { deleteDefinitionsOfExperiment } from '../data/parameter-definitions';
import { deleteProject, getProjectById } from '../data/projects';
import {
  deleteSample,
  getSampleById,
  listSamplesByExperiment,
  removeStudyFromSamples
} from '../data/samples';
import {
  deleteStudiesOfExperiment,
  deleteStudy,
  getStudyInExperiment
} from '../data/studies';

/** What a delete took with it, so the features that hold other data about it can clean up too. */
export type Removed = {
  characterizationIds: string[];
  experimentIds: string[];
  sampleCount: number;
  fileCount: number;
};

const EMPTY: Removed = {
  characterizationIds: [],
  experimentIds: [],
  sampleCount: 0,
  fileCount: 0
};

/** Removes the files of the characterizations from storage, then their records. */
const removeFilesOf = async (
  characterizationIds: string[]
): Promise<number> => {
  let count = 0;
  for (const id of characterizationIds) {
    for (const dataset of await deleteDatasetsOfCharacterization(id)) {
      await getStorage().delete(dataset.storagePath);
      count += 1;
    }
  }

  return count;
};

/**
 * Removes a sample with its measurements and their files (from storage). Other
 * samples are untouched.
 *
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample to remove.
 * @returns What went, or null when the sample is not in the experiment.
 */
export const removeSample = async (
  experimentId: string,
  sampleId: string
): Promise<Removed | null> => {
  if ((await getSampleById(sampleId))?.experimentId !== experimentId) {
    return null;
  }

  const characterizations = await deleteCharacterizationsOfSample(sampleId);
  const characterizationIds = characterizations.map(item => item.id);
  const fileCount = await removeFilesOf(characterizationIds);
  await deleteSample(experimentId, sampleId);

  return { ...EMPTY, characterizationIds, sampleCount: 1, fileCount };
};

/**
 * Removes a study. Its samples stay with all their data and only lose the tag.
 *
 * @param experimentId - The experiment the caller says owns the study.
 * @param studyId - The study to remove.
 * @returns How many samples had the tag, or null when the study is not there.
 */
export const removeStudy = async (
  experimentId: string,
  studyId: string
): Promise<number | null> => {
  if (!(await getStudyInExperiment(experimentId, studyId))) return null;

  const count = await removeStudyFromSamples(experimentId, studyId);
  await deleteStudy(experimentId, studyId);

  return count;
};

/**
 * Removes an experiment: every sample (with measurements and files), its
 * columns, calculated columns and studies, then the experiment.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment to remove.
 * @returns What went, or null when the experiment is not in the project.
 */
export const removeExperiment = async (
  projectId: string,
  experimentId: string
): Promise<Removed | null> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return null;

  const removed: Removed = { ...EMPTY, experimentIds: [experimentId] };
  for (const sample of await listSamplesByExperiment(experimentId)) {
    const gone = await removeSample(experimentId, sample.id);
    if (!gone) continue;

    removed.characterizationIds.push(...gone.characterizationIds);
    removed.sampleCount += gone.sampleCount;
    removed.fileCount += gone.fileCount;
  }
  await deleteDerivedColumnsOfExperiment(experimentId);
  await deleteDefinitionsOfExperiment(experimentId);
  await deleteStudiesOfExperiment(experimentId);
  await deleteExperiment(experimentId);

  return removed;
};

/**
 * Removes a project: every experiment as above, then the project (its
 * background goes with its record).
 *
 * @param projectId - The project to remove.
 * @returns What went, or null when there is no such project.
 */
export const removeProject = async (
  projectId: string
): Promise<Removed | null> => {
  if (!(await getProjectById(projectId))) return null;

  const removed: Removed = { ...EMPTY };
  for (const experiment of await listExperimentsByProject(projectId)) {
    const gone = await removeExperiment(projectId, experiment.id);
    if (!gone) continue;

    removed.characterizationIds.push(...gone.characterizationIds);
    removed.experimentIds.push(...gone.experimentIds);
    removed.sampleCount += gone.sampleCount;
    removed.fileCount += gone.fileCount;
  }
  await deleteProject(projectId);

  return removed;
};
