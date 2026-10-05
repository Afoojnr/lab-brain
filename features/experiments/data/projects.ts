import type { ProjectFormValues } from '../schemas';
import type { Project } from '../types';
import { DEMO_PROJECTS } from './demo-projects';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
const projects: Project[] = [...DEMO_PROJECTS];

/**
 * All projects, newest first, for the dashboard grid.
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
    createdAt: new Date()
  };

  projects.unshift(project);
  return project;
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
