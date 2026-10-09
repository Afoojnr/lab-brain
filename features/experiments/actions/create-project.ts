'use server';

import { revalidatePath } from 'next/cache';

import { revalidateNavigation } from '../revalidate-navigation';

import { createProject } from '../data/projects';
import { projectFormSchema } from '../schemas';

/**
 * Creates a project from the New project form, then refreshes the projects page and the sidebar.
 * The form validates first; invalid input here only comes from a direct call,
 * so it is ignored.
 *
 * @param input - Raw form values.
 */
export const createProjectAction = async (input: unknown): Promise<void> => {
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) return;

  // TODO: remove in Step 4, when projects are stored in the database.
  console.log('[createProject]', JSON.stringify(parsed.data));

  await createProject(parsed.data);
  revalidateNavigation();
  revalidatePath('/');
};
