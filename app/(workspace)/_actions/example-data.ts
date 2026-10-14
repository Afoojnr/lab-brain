'use server';

import { revalidatePath } from 'next/cache';

import { deleteAnalysesOf } from '@/features/characterization/server';
import {
  removeProject,
  revalidateNavigation
} from '@/features/experiments/server';
import { deleteSavedPlotsOf } from '@/features/plots/server';
import { deleteReferencesOf } from '@/features/references/server';
import { isDemoMode } from '@/lib/config/local-settings';
import { getDb } from '@/lib/db/client';
import { DEMO_PROJECT_IDS, seedDemo } from '@/lib/db/seed';
import { copyDemoFiles } from '@/lib/storage/demo-files';

// The example data is a project like any other once it is in: adding it only
// inserts its rows (and puts its few files in storage), and removing it goes
// through the same cascade as deleting a project. Only the public demo
// (LAB_BRAIN_DEMO) offers it; a normal install stays clean.

const refresh = () => {
  revalidatePath('/', 'layout');
  revalidateNavigation();
};

/**
 * Adds the example projects next to the visitor's own, without touching them.
 *
 * @returns Whether anything was added (false when they are already there or this is not the demo).
 */
export const addExampleDataAction = async (): Promise<boolean> => {
  if (!isDemoMode()) return false;

  const added = await seedDemo(await getDb());
  if (added) await copyDemoFiles();
  refresh();

  return added;
};

/**
 * Removes the example projects and everything in them, and nothing else.
 *
 * @returns How many example projects were removed.
 */
export const removeExampleDataAction = async (): Promise<number> => {
  if (!isDemoMode()) return 0;

  let removedProjects = 0;
  for (const projectId of DEMO_PROJECT_IDS) {
    await deleteReferencesOf(projectId);
    const removed = await removeProject(projectId);
    if (!removed) continue;

    await deleteAnalysesOf(removed.characterizationIds);
    for (const experimentId of removed.experimentIds) {
      await deleteSavedPlotsOf(experimentId);
    }
    removedProjects += 1;
  }
  refresh();

  return removedProjects;
};
