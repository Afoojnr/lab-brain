import type {
  ProjectBackgroundValues,
  ProjectFormValues
} from '../schemas/schemas';
import type { Project } from '../types';
import { DEMO_PROJECTS } from './demo-projects';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
// On `globalThis` because a Route Handler (the assistant) is bundled apart from
// the pages and actions: a plain module-level list would be a separate copy
// there and would not see what was just created. A database has no such problem.
const store = globalThis as { __labBrainProjects?: Project[] };
const projects: Project[] = (store.__labBrainProjects ??= [...DEMO_PROJECTS]);

/**
 * All projects, newest first, for the projects page and the sidebar.
 *
 * @returns A copy of the list, so callers cannot mutate storage.
 */
export const listProjects = async (): Promise<Project[]> => [...projects];

/**
 * One project by id, for the project page.
 *
 * @param id - Project id.
 * @returns The project, or undefined when no project has that id.
 */
export const getProjectById = async (
  id: string
): Promise<Project | undefined> => projects.find(project => project.id === id);

/**
 * Stores a new project. Input must already be validated by `projectFormSchema`.
 *
 * @param values - Validated form values.
 * @returns The stored project.
 */
export const createProject = async (
  values: ProjectFormValues
): Promise<Project> => {
  const project: Project = {
    id: crypto.randomUUID(),
    name: values.name,
    description: values.description === '' ? null : values.description,
    background: null,
    createdAt: new Date()
  };

  projects.unshift(project);
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
  const index = projects.findIndex(project => project.id === id);
  const existing = projects[index];
  if (!existing) return undefined;

  const updated: Project = {
    ...existing,
    background: values.background === '' ? null : values.background
  };
  projects[index] = updated;
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
  const index = projects.findIndex(project => project.id === id);
  const existing = projects[index];
  if (!existing) return undefined;

  const updated: Project = {
    ...existing,
    name: values.name,
    description: values.description === '' ? null : values.description
  };
  projects[index] = updated;
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
  const index = projects.findIndex(project => project.id === id);
  if (index === -1) return false;

  projects.splice(index, 1);
  return true;
};
