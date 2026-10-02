import type { ProjectFormValues } from '../schemas';
import type { Project } from '../types';
import { DEMO_PROJECTS } from './demo-projects';

// TODO: Step 4 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
const projects: Project[] = [...DEMO_PROJECTS];

/**
 * All projects, newest first, for the dashboard grid.
 *
 * @returns A copy of the list, so callers cannot mutate storage.
 */
export const listProjects = async (): Promise<Project[]> => [...projects];

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
    codePrefix: values.codePrefix,
    protocol: values.protocol === '' ? null : values.protocol,
    createdAt: new Date()
  };

  projects.unshift(project);
  return project;
};
