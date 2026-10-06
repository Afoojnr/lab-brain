import type { ValidationContext } from '../../validation-types';

/** What the import page loads for the wizard: the project's stored data, per possible target. */
export type ImportData = {
  experiments: { id: string; name: string; codePrefix: string }[];
  /** For a new experiment: no columns or samples, every code in the project is "other". */
  newExperiment: ValidationContext;
  /** For each existing experiment, by its id. */
  existing: Record<string, ValidationContext>;
};

export type StepId =
  'upload' | 'layout' | 'target' | 'mapping' | 'preview' | 'done';

export const STEP_ORDER: StepId[] = [
  'upload',
  'layout',
  'target',
  'mapping',
  'preview',
  'done'
];
