import type { StudyFormValues } from '../schemas';
import type { Study } from '../types';
import { DEMO_STUDIES } from './demo-studies';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
const studies: Study[] = [...DEMO_STUDIES];

/**
 * An experiment's studies, oldest first.
 *
 * @param experimentId - Owning experiment's id.
 */
export const listStudiesByExperiment = async (
  experimentId: string
): Promise<Study[]> =>
  studies
    .filter(study => study.experimentId === experimentId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

/**
 * One study, but only when it belongs to the given experiment, so an
 * study can never be reached through another experiment's page.
 *
 * @param experimentId - The experiment the caller says owns the study.
 * @param id - Study id.
 */
export const getStudyInExperiment = async (
  experimentId: string,
  id: string
): Promise<Study | undefined> =>
  studies.find(study => study.id === id && study.experimentId === experimentId);

/**
 * Changes a study's name and description. Which samples belong to it is
 * untouched. Input must already be validated by `buildStudyFormSchema`.
 *
 * @param experimentId - The experiment owning the study.
 * @param id - The study to change.
 * @param values - Validated name and description.
 * @returns The updated study, or undefined when the experiment has none with that id.
 */
export const updateStudy = async (
  experimentId: string,
  id: string,
  values: StudyFormValues
): Promise<Study | undefined> => {
  const index = studies.findIndex(
    study => study.id === id && study.experimentId === experimentId
  );
  const existing = studies[index];
  if (!existing) return undefined;

  const updated: Study = {
    ...existing,
    name: values.name,
    description: values.description === '' ? null : values.description
  };
  studies[index] = updated;
  return updated;
};

/**
 * Stores a new study. Input must already be validated by
 * `buildStudyFormSchema`.
 *
 * @param experimentId - Owning experiment's id.
 * @param values - Validated name and description.
 * @returns The stored study.
 */
export const createStudy = async (
  experimentId: string,
  values: StudyFormValues
): Promise<Study> => {
  const study: Study = {
    id: crypto.randomUUID(),
    experimentId,
    name: values.name,
    description: values.description === '' ? null : values.description,
    createdAt: new Date()
  };

  studies.push(study);
  return study;
};
