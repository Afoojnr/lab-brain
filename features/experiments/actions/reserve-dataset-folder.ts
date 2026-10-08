'use server';

import { getStorage } from '@/lib/storage';
import { freeFolderName, safeSegment, techniqueDir } from '@/lib/storage/paths';

import { getCharacterizationOfSample } from '../data/characterizations';
import { getExperimentInProject } from '../data/experiments';
import { getProjectById } from '../data/projects';
import { getSampleById } from '../data/samples';

/**
 * Picks the name an uploaded folder is stored under, before its files are
 * sent: its own name, or `-2`, `-3`, ... when an earlier upload used it, so two
 * uploads of one folder never mix. Checks that the ids belong together first.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample the characterization belongs to.
 * @param characterizationId - The characterization the folder is attached to.
 * @param folderName - The folder's name on the user's computer.
 * @returns The name to send with each file, or null when ignored.
 */
export const reserveDatasetFolderAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  characterizationId: string,
  folderName: string
): Promise<string | null> => {
  const [project, experiment, sample, characterization] = await Promise.all([
    getProjectById(projectId),
    getExperimentInProject(projectId, experimentId),
    getSampleById(sampleId),
    getCharacterizationOfSample(sampleId, characterizationId)
  ]);
  if (!project || !experiment || !characterization) return null;
  if (sample?.experimentId !== experimentId) return null;
  if (typeof folderName !== 'string' || folderName.trim() === '') return null;

  const parts = {
    projectName: project.name,
    experimentPrefix: experiment.codePrefix,
    sampleCode: sample.code,
    technique: characterization.technique,
    measuredOn: characterization.measuredOn
  };
  const taken = await getStorage().list(techniqueDir(parts));

  return freeFolderName(parts, safeSegment(folderName), taken);
};
