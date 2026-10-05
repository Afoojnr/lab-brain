import type { ExperimentFormValues } from '../schemas';
import type { Experiment } from '../types';
import { DEMO_EXPERIMENTS } from './demo-experiments';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
const experimentList: Experiment[] = [...DEMO_EXPERIMENTS];

/**
 * A project's experiment, oldest first (like the sheets of a spreadsheet).
 *
 * @param projectId - Owning project's id.
 */
export const listExperimentsByProject = async (
  projectId: string
): Promise<Experiment[]> =>
  experimentList
    .filter(experiment => experiment.projectId === projectId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

/**
 * One experiment by id.
 *
 * @param id - Experiment id.
 * @returns The experiment, or undefined when no experiment has that id.
 */
export const getExperimentById = async (
  id: string
): Promise<Experiment | undefined> =>
  experimentList.find(experiment => experiment.id === id);

/**
 * One experiment, but only when it belongs to the given project. Actions use this
 * so an experiment id can never be reached through a different project's URL.
 *
 * @param projectId - The project the caller says owns the experiment.
 * @param experimentId - Experiment id.
 */
export const getExperimentInProject = async (
  projectId: string,
  experimentId: string
): Promise<Experiment | undefined> => {
  const experiment = await getExperimentById(experimentId);
  return experiment?.projectId === projectId ? experiment : undefined;
};

/**
 * Stores a new experiment. Input must already be validated by
 * `buildExperimentFormSchema`.
 *
 * @param projectId - Owning project's id.
 * @param values - Validated name and prefix.
 * @returns The stored experiment.
 */
export const createExperiment = async (
  projectId: string,
  values: ExperimentFormValues
): Promise<Experiment> => {
  const experiment: Experiment = {
    id: crypto.randomUUID(),
    projectId,
    name: values.name,
    codePrefix: values.codePrefix,
    protocol: values.protocol === '' ? null : values.protocol,
    createdAt: new Date()
  };

  experimentList.push(experiment);
  return experiment;
};

/**
 * Changes an experiment's name, prefix and protocol. Its columns, samples and
 * existing sample codes are untouched. Input must already be validated by
 * `buildExperimentFormSchema`.
 *
 * @param id - The experiment to change.
 * @param values - Validated name, prefix and protocol.
 * @returns The updated experiment, or undefined when no experiment has that id.
 */
export const updateExperiment = async (
  id: string,
  values: ExperimentFormValues
): Promise<Experiment | undefined> => {
  const index = experimentList.findIndex(experiment => experiment.id === id);
  const existing = experimentList[index];
  if (!existing) return undefined;

  const updated: Experiment = {
    ...existing,
    name: values.name,
    codePrefix: values.codePrefix,
    protocol: values.protocol === '' ? null : values.protocol
  };
  experimentList[index] = updated;
  return updated;
};
