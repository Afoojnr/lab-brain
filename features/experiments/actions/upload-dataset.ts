'use server';

import path from 'node:path';

import { revalidatePath } from 'next/cache';

import { getStorage } from '@/lib/storage';
import {
  datasetPath,
  safeSubPath,
  withoutCollision
} from '@/lib/storage/paths';

import { contentTypeFor, MAX_DATASET_BYTES } from '../datasets';
import { getCharacterizationOfSample } from '../data/characterizations';
import { createDataset } from '../data/datasets';
import { getExperimentInProject } from '../data/experiments';
import { getProjectById } from '../data/projects';
import { getSampleById } from '../data/samples';

/**
 * Attaches one file to a characterization: checks that the project,
 * experiment, sample and characterization belong together, that the file is
 * there and within the size limit, writes it to storage under
 * `project/experiment/sample/technique/`, then records it. A second file with
 * the same name never replaces the first. Invalid input only comes from a
 * direct call, so it is ignored.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample the characterization belongs to.
 * @param characterizationId - The characterization the file is attached to.
 * @param formData - Holds the file under `file`. A file from an uploaded folder
 *   also has `folder` (the reserved folder name) and `relativePath` (its path
 *   inside it). `refresh` = `0` skips re-rendering the pages (set on every file of a batch but the last).
 * @returns The new dataset's id, or null when ignored.
 */
export const uploadDatasetAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string,
  characterizationId: string,
  formData: FormData
): Promise<string | null> => {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_DATASET_BYTES) return null;

  const [project, experiment, sample, characterization] = await Promise.all([
    getProjectById(projectId),
    getExperimentInProject(projectId, experimentId),
    getSampleById(sampleId),
    getCharacterizationOfSample(sampleId, characterizationId)
  ]);
  if (!project || !experiment || !characterization) return null;
  if (sample?.experimentId !== experimentId) return null;

  const folderField = formData.get('folder');
  const pathField = formData.get('relativePath');
  const folder =
    typeof folderField === 'string' && folderField.trim() !== ''
      ? folderField.trim()
      : null;
  // A path without a folder, or one that is empty or too deep, is not accepted.
  const relativePath =
    folder && typeof pathField === 'string' ? pathField : null;
  if (folder && (!relativePath || !safeSubPath(relativePath))) return null;

  const storage = getStorage();
  const wanted = datasetPath({
    projectName: project.name,
    experimentPrefix: experiment.codePrefix,
    sampleCode: sample.code,
    technique: characterization.technique,
    measuredOn: characterization.measuredOn,
    fileName: file.name,
    folder,
    relativePath
  });
  const storagePath = withoutCollision(
    wanted,
    await storage.list(path.posix.dirname(wanted))
  );

  await storage.upload(storagePath, new Uint8Array(await file.arrayBuffer()));
  const dataset = await createDataset(characterization.id, {
    fileName: file.name,
    folder,
    relativePath,
    storagePath,
    contentType: contentTypeFor(file.name),
    sizeBytes: file.size
  });
  if (formData.get('refresh') !== '0') {
    revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);
    revalidatePath(
      `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}`
    );
    revalidatePath(
      `/projects/${projectId}/experiments/${experimentId}/samples/${sampleId}/characterizations/${characterizationId}`
    );
  }

  return dataset.id;
};
