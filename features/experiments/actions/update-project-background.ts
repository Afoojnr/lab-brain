'use server';

import { revalidatePath } from 'next/cache';

import { updateProjectBackground } from '../data/projects';
import { projectBackgroundSchema } from '../schemas/schemas';

/**
 * Saves a project's background text, then refreshes its page. Invalid input
 * only comes from a direct call, so it is ignored.
 *
 * @param projectId - The project to change.
 * @param input - Raw form values.
 * @returns True when the background was saved, false when ignored or not found.
 */
export const updateProjectBackgroundAction = async (
  projectId: string,
  input: unknown
): Promise<boolean> => {
  const parsed = projectBackgroundSchema.safeParse(input);
  if (!parsed.success) return false;

  const project = await updateProjectBackground(projectId, parsed.data);
  if (!project) return false;

  revalidatePath(`/projects/${projectId}`);

  return true;
};
