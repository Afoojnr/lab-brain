'use server';

import { revalidatePath } from 'next/cache';

import { revalidateNavigation } from '../navigation/revalidate-navigation';

import { updateProject } from '../data/projects';
import { projectFormSchema } from '../schemas/schemas';

/**
 * Changes a project from the Edit project form, then refreshes the pages that
 * show it. Invalid input only comes from a direct call, so it is ignored.
 */
export const updateProjectAction = async (
  projectId: string,
  input: unknown
): Promise<boolean> => {
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) return false;

  const project = await updateProject(projectId, parsed.data);
  if (!project) return false;

  revalidateNavigation();

  revalidatePath('/');
  revalidatePath(`/projects/${projectId}`);

  return true;
};
