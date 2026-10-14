'use server';

import { revalidatePath } from 'next/cache';

import { deleteAnalysesOf } from '@/features/characterization/server';
import {
  getExperimentInProject,
  getProjectById,
  removeExperiment,
  removeProject,
  removeSample,
  revalidateNavigation
} from '@/features/experiments/server';
import { deleteSavedPlotsOf } from '@/features/plots/server';
import { deleteReferencesOf } from '@/features/references/server';

// Deleting a record touches data held by several features (saved analyses,
// saved plots, references). No feature may import them all, so this page-level
// file composes the cleanup after the experiments feature has removed its own.

/**
 * Deletes a sample with its measurements and files, and the analyses saved for
 * them. Other samples are untouched.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment the caller says owns the sample.
 * @param sampleId - The sample to delete.
 */
export const deleteSampleAction = async (
  projectId: string,
  experimentId: string,
  sampleId: string
): Promise<boolean> => {
  if (!(await getExperimentInProject(projectId, experimentId))) return false;

  const removed = await removeSample(experimentId, sampleId);
  if (!removed) return false;

  await deleteAnalysesOf(removed.characterizationIds);
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return true;
};

/**
 * Deletes an experiment: its samples (with measurements and files), columns and
 * studies, and its saved plots and analyses. The caller must type its exact
 * name, which is checked here again.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - The experiment to delete.
 * @param typedName - What the user typed to confirm.
 */
export const deleteExperimentAction = async (
  projectId: string,
  experimentId: string,
  typedName: string
): Promise<boolean> => {
  const experiment = await getExperimentInProject(projectId, experimentId);
  if (!experiment || typedName.trim() !== experiment.name) return false;

  const removed = await removeExperiment(projectId, experimentId);
  if (!removed) return false;

  await deleteAnalysesOf(removed.characterizationIds);
  await deleteSavedPlotsOf(experimentId);
  revalidatePath(`/projects/${projectId}`);
  revalidateNavigation();

  return true;
};

/**
 * Deletes a project: every experiment as above, its references (with their
 * stored files) and its background. The caller must type its exact name, which
 * is checked here again.
 *
 * @param projectId - The project to delete.
 * @param typedName - What the user typed to confirm.
 */
export const deleteProjectAction = async (
  projectId: string,
  typedName: string
): Promise<boolean> => {
  const project = await getProjectById(projectId);
  if (!project || typedName.trim() !== project.name) return false;

  const removed = await removeProject(projectId);
  if (!removed) return false;

  await deleteAnalysesOf(removed.characterizationIds);
  for (const experimentId of removed.experimentIds) {
    await deleteSavedPlotsOf(experimentId);
  }
  await deleteReferencesOf(projectId);
  revalidatePath('/');
  revalidateNavigation();

  return true;
};
