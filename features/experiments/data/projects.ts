import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';

import type {
  ProjectBackgroundValues,
  ProjectFormValues
} from '../schemas/schemas';
import type { Project } from '../types';

const emptyToNull = (text: string): string | null =>
  text === '' ? null : text;

/**
 * All projects, newest first, for the projects page and the sidebar.
 */
export const listProjects = async (): Promise<Project[]> => {
  const db = await getDb();

  return db.select().from(projects).orderBy(desc(projects.createdAt));
};

/**
 * One project by id, for the project page.
 *
 * @param id - Project id.
 * @returns The project, or undefined when no project has that id.
 */
export const getProjectById = async (
  id: string
): Promise<Project | undefined> => {
  const db = await getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));

  return project;
};

/**
 * Stores a new project. Input must already be validated by `projectFormSchema`.
 *
 * @param values - Validated form values.
 * @returns The stored project.
 */
export const createProject = async (
  values: ProjectFormValues
): Promise<Project> => {
  const db = await getDb();
  const project: Project = {
    id: crypto.randomUUID(),
    name: values.name,
    description: emptyToNull(values.description),
    background: null,
    createdAt: new Date()
  };
  await db.insert(projects).values(project);

  return project;
};

/**
 * Sets a project's background text (empty clears it). Input must already be
 * validated by `projectBackgroundSchema`.
 *
 * @param id - The project to change.
 * @param values - Validated form values.
 * @returns The updated project, or undefined when no project has that id.
 */
export const updateProjectBackground = async (
  id: string,
  values: ProjectBackgroundValues
): Promise<Project | undefined> => {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ background: emptyToNull(values.background) })
    .where(eq(projects.id, id))
    .returning();

  return updated;
};

/**
 * Changes a project's name and description. Its experiments are untouched.
 * Input must already be validated by `projectFormSchema`.
 *
 * @param id - The project to change.
 * @param values - Validated form values.
 * @returns The updated project, or undefined when no project has that id.
 */
export const updateProject = async (
  id: string,
  values: ProjectFormValues
): Promise<Project | undefined> => {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({
      name: values.name,
      description: emptyToNull(values.description)
    })
    .where(eq(projects.id, id))
    .returning();

  return updated;
};

/**
 * Removes a project's own record. Everything that belongs to it (experiments,
 * samples, files, ...) is removed by the caller first.
 *
 * @param id - The project to remove.
 * @returns Whether a project was removed.
 */
export const deleteProject = async (id: string): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });

  return removed.length > 0;
};
