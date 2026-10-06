import { z } from 'zod';

import { parseParameterInput, parseParameterInputs } from './parameters';
import type {
  ParameterDefinition,
  ParameterInput,
  ParameterValues,
  Study
} from './types';

/** Keys under `projects.form.errors` in `messages/<locale>/projects.json`; Zod reports these, the UI translates them. */
export const PROJECT_FORM_ERRORS = [
  'nameRequired',
  'nameTooLong',
  'descriptionTooLong'
] as const;

export type ProjectFormError = (typeof PROJECT_FORM_ERRORS)[number];

const PROJECT_NAME_MAX_LENGTH = 80;
const PROJECT_DESCRIPTION_MAX_LENGTH = 1000;

export const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'nameRequired' satisfies ProjectFormError })
    .max(PROJECT_NAME_MAX_LENGTH, {
      error: 'nameTooLong' satisfies ProjectFormError
    }),
  description: z
    .string()
    .trim()
    .max(PROJECT_DESCRIPTION_MAX_LENGTH, {
      error: 'descriptionTooLong' satisfies ProjectFormError
    })
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

/**
 * Narrows a Zod error message to a known translation key.
 *
 * @param message - Message reported by {@link projectFormSchema}.
 * @returns True when the message is one of {@link PROJECT_FORM_ERRORS}.
 */
export const isProjectFormError = (
  message: string | undefined
): message is ProjectFormError =>
  PROJECT_FORM_ERRORS.some(error => error === message);

/** Keys under `experiment.form.errors` in `messages/<locale>/experiment.json`. */
export const EXPERIMENT_FORM_ERRORS = [
  'nameRequired',
  'nameTooLong',
  'codePrefixInvalid',
  'codePrefixDuplicate',
  'protocolTooLong'
] as const;

export type ExperimentFormError = (typeof EXPERIMENT_FORM_ERRORS)[number];

const EXPERIMENT_NAME_MAX_LENGTH = 80;
const EXPERIMENT_PROTOCOL_MAX_LENGTH = 1000;

/** A letter, then 1-5 uppercase letters or digits (e.g. `ALD`, `B2`). */
const CODE_PREFIX_PATTERN = /^[A-Z][A-Z0-9]{1,5}$/;

/**
 * The New experiment form's schema. Prefixes must be unique within a project, so
 * it is built from the project's other experiment's prefixes.
 *
 * @param otherPrefixes - Prefixes of the project's existing experiment.
 */
export const buildExperimentFormSchema = (otherPrefixes: string[]) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: 'nameRequired' satisfies ExperimentFormError })
      .max(EXPERIMENT_NAME_MAX_LENGTH, {
        error: 'nameTooLong' satisfies ExperimentFormError
      }),
    codePrefix: z
      .string()
      .trim()
      .regex(CODE_PREFIX_PATTERN, {
        error: 'codePrefixInvalid' satisfies ExperimentFormError
      })
      .refine(prefix => !otherPrefixes.includes(prefix), {
        error: 'codePrefixDuplicate' satisfies ExperimentFormError
      }),
    /** Empty means no protocol. */
    protocol: z
      .string()
      .trim()
      .max(EXPERIMENT_PROTOCOL_MAX_LENGTH, {
        error: 'protocolTooLong' satisfies ExperimentFormError
      })
  });

export type ExperimentFormValues = z.infer<
  ReturnType<typeof buildExperimentFormSchema>
>;

/**
 * Narrows a Zod error message to a known translation key.
 *
 * @param message - Message reported by {@link buildExperimentFormSchema}.
 */
export const isExperimentFormError = (
  message: string | undefined
): message is ExperimentFormError =>
  EXPERIMENT_FORM_ERRORS.some(error => error === message);

/** Keys under `parameters.form.errors` in `messages/<locale>/parameters.json`. */
export const PARAMETER_FORM_ERRORS = [
  'nameRequired',
  'nameTooLong',
  'nameDuplicate',
  'unitTooLong',
  'kindInvalid',
  'defaultNotANumber',
  'defaultTooLong',
  'resultHasDefault'
] as const;

export type ParameterFormError = (typeof PARAMETER_FORM_ERRORS)[number];

const PARAMETER_NAME_MAX_LENGTH = 60;
const PARAMETER_UNIT_MAX_LENGTH = 20;
const TEXT_VALUE_MAX_LENGTH = 200;

/**
 * The Add/Edit parameter form's schema. Names must be unique within one
 * experiment, so it is built from the other parameters' names.
 *
 * @param otherNames - Names of the experiment's other parameters.
 */
export const buildParameterFormSchema = (otherNames: string[]) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(1, { error: 'nameRequired' satisfies ParameterFormError })
        .max(PARAMETER_NAME_MAX_LENGTH, {
          error: 'nameTooLong' satisfies ParameterFormError
        })
        .refine(
          name =>
            !otherNames.some(
              other => other.toLowerCase() === name.toLowerCase()
            ),
          { error: 'nameDuplicate' satisfies ParameterFormError }
        ),
      unit: z
        .string()
        .trim()
        .max(PARAMETER_UNIT_MAX_LENGTH, {
          error: 'unitTooLong' satisfies ParameterFormError
        }),
      kind: z.enum(['number', 'text'], {
        error: 'kindInvalid' satisfies ParameterFormError
      }),
      role: z.enum(['parameter', 'result']),
      /** Typed in; empty means no default. Checked against `kind` below. */
      defaultValue: z.string().trim()
    })
    .superRefine((values, context) => {
      if (values.role === 'result' && values.defaultValue !== '') {
        context.addIssue({
          code: 'custom',
          path: ['defaultValue'],
          message: 'resultHasDefault' satisfies ParameterFormError
        });
        return;
      }

      const parsed = parseParameterInput(values.defaultValue, values.kind);
      const message: ParameterFormError | undefined = !parsed.isValid
        ? 'defaultNotANumber'
        : typeof parsed.value === 'string' &&
            parsed.value.length > TEXT_VALUE_MAX_LENGTH
          ? 'defaultTooLong'
          : undefined;
      if (message) {
        context.addIssue({ code: 'custom', path: ['defaultValue'], message });
      }
    });

export type ParameterFormValues = z.infer<
  ReturnType<typeof buildParameterFormSchema>
>;

/**
 * Narrows a Zod error message to a known translation key.
 *
 * @param message - Message reported by {@link buildParameterFormSchema}.
 */
export const isParameterFormError = (
  message: string | undefined
): message is ParameterFormError =>
  PARAMETER_FORM_ERRORS.some(error => error === message);

/**
 * Converts a form that already passed {@link buildParameterFormSchema} into
 * what is stored: the default as a number or text, or null when left empty
 * (and always null for a result).
 *
 * @param values - The validated form values.
 */
export const toParameterInput = (
  values: ParameterFormValues
): ParameterInput => {
  const parsed = parseParameterInput(values.defaultValue, values.kind);

  return {
    name: values.name,
    unit: values.unit,
    kind: values.kind,
    role: values.role,
    defaultValue:
      values.role === 'result' || !parsed.isValid
        ? null
        : (parsed.value ?? null)
  };
};

/** Keys under `samples.form.errors` in `messages/<locale>/samples.json`. */
export const SAMPLE_FORM_ERRORS = [
  'codeRequired',
  'codeTooLong',
  'codeDuplicate',
  'dateInvalid',
  'implementationTooLong',
  'observationTooLong',
  'valueNotANumber',
  'valueTooLong',
  'noteTooLong'
] as const;

export type SampleFormError = (typeof SAMPLE_FORM_ERRORS)[number];

const SAMPLE_CODE_MAX_LENGTH = 40;
const LONG_TEXT_MAX_LENGTH = 2000;
const NOTE_MAX_LENGTH = 500;

const isCalendarDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

/**
 * The Add/Edit sample form's schema, built from the experiment's own columns: a
 * number column rejects text with an error on that exact field (never `NaN`
 * or `0`), and the code must be unique within the project. Values are
 * typed-in strings; {@link toSampleInput} converts them.
 *
 * @param definitions - The experiment's parameters.
 * @param otherCodes - Codes of the project's other samples (case-insensitive).
 */
export const buildSampleFormSchema = (
  definitions: ParameterDefinition[],
  otherCodes: string[]
) =>
  z
    .object({
      code: z
        .string()
        .trim()
        .min(1, { error: 'codeRequired' satisfies SampleFormError })
        .max(SAMPLE_CODE_MAX_LENGTH, {
          error: 'codeTooLong' satisfies SampleFormError
        })
        .refine(
          code =>
            !otherCodes.some(
              other => other.toLowerCase() === code.toLowerCase()
            ),
          { error: 'codeDuplicate' satisfies SampleFormError }
        ),
      /** Empty means not recorded. */
      performedOn: z
        .string()
        .trim()
        .refine(value => value === '' || isCalendarDate(value), {
          error: 'dateInvalid' satisfies SampleFormError
        }),
      values: z.record(z.string(), z.string()),
      /** The studies this sample belongs to; the server keeps only the experiment's own. */
      studyIds: z.array(z.string()),
      implementation: z
        .string()
        .trim()
        .max(LONG_TEXT_MAX_LENGTH, {
          error: 'implementationTooLong' satisfies SampleFormError
        }),
      observation: z
        .string()
        .trim()
        .max(LONG_TEXT_MAX_LENGTH, {
          error: 'observationTooLong' satisfies SampleFormError
        }),
      /** One short comment on the whole sample. Empty means no note. */
      note: z
        .string()
        .trim()
        .max(NOTE_MAX_LENGTH, {
          error: 'noteTooLong' satisfies SampleFormError
        })
    })
    .superRefine((sample, context) => {
      for (const definition of definitions) {
        const parsed = parseParameterInput(
          sample.values[definition.id] ?? '',
          definition.kind
        );
        const message: SampleFormError | undefined = !parsed.isValid
          ? 'valueNotANumber'
          : typeof parsed.value === 'string' &&
              parsed.value.length > TEXT_VALUE_MAX_LENGTH
            ? 'valueTooLong'
            : undefined;
        if (message) {
          context.addIssue({
            code: 'custom',
            path: ['values', definition.id],
            message
          });
        }
      }
    });

export type SampleFormValues = z.infer<
  ReturnType<typeof buildSampleFormSchema>
>;

/**
 * Narrows a Zod error message to a known translation key.
 *
 * @param message - Message reported by {@link buildSampleFormSchema}.
 */
export const isSampleFormError = (
  message: string | undefined
): message is SampleFormError =>
  SAMPLE_FORM_ERRORS.some(error => error === message);

export type SampleInput = {
  code: string;
  performedOn: string | null;
  values: ParameterValues;
  studyIds: string[];
  implementation: string | null;
  observation: string | null;
  note: string | null;
};

/**
 * Converts a form that already passed {@link buildSampleFormSchema} into
 * stored values: numbers for number columns, empty cells omitted.
 *
 * @param definitions - The same parameters the schema was built from.
 * @param studies - The experiment's own studies; any other study id is dropped.
 * @param values - The validated form values.
 */
export const toSampleInput = (
  definitions: ParameterDefinition[],
  studies: Pick<Study, 'id'>[],
  values: SampleFormValues
): SampleInput => ({
  code: values.code,
  performedOn: values.performedOn === '' ? null : values.performedOn,
  values: parseParameterInputs(definitions, values.values).values,
  studyIds: studies
    .map(study => study.id)
    .filter(id => values.studyIds.includes(id)),
  implementation: values.implementation === '' ? null : values.implementation,
  observation: values.observation === '' ? null : values.observation,
  note: values.note === '' ? null : values.note
});

/** Keys under `studies.form.errors` in `messages/<locale>/studies.json`. */
export const STUDY_FORM_ERRORS = [
  'nameRequired',
  'nameTooLong',
  'nameDuplicate',
  'descriptionTooLong'
] as const;

export type StudyFormError = (typeof STUDY_FORM_ERRORS)[number];

const STUDY_NAME_MAX_LENGTH = 60;
const STUDY_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * The New study form's schema. Names must be unique within one experiment
 * (ignoring case), so it is built from the experiment's other study names.
 *
 * @param otherNames - Names of the experiment's existing studies.
 */
export const buildStudyFormSchema = (otherNames: string[]) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: 'nameRequired' satisfies StudyFormError })
      .max(STUDY_NAME_MAX_LENGTH, {
        error: 'nameTooLong' satisfies StudyFormError
      })
      .refine(
        name =>
          !otherNames.some(other => other.toLowerCase() === name.toLowerCase()),
        { error: 'nameDuplicate' satisfies StudyFormError }
      ),
    /** Free notes about the study. Empty means none. */
    description: z
      .string()
      .trim()
      .max(STUDY_DESCRIPTION_MAX_LENGTH, {
        error: 'descriptionTooLong' satisfies StudyFormError
      })
  });

export type StudyFormValues = z.infer<ReturnType<typeof buildStudyFormSchema>>;

/**
 * Narrows a Zod error message to a known translation key.
 *
 * @param message - Message reported by {@link buildStudyFormSchema}.
 */
export const isStudyFormError = (
  message: string | undefined
): message is StudyFormError =>
  STUDY_FORM_ERRORS.some(error => error === message);

/** Keys under `characterizations.form.errors` in `messages/<locale>/characterizations.json`. */
export const CHARACTERIZATION_FORM_ERRORS = [
  'techniqueRequired',
  'techniqueTooLong',
  'dateInvalid',
  'noteTooLong'
] as const;

export type CharacterizationFormError =
  (typeof CHARACTERIZATION_FORM_ERRORS)[number];

const TECHNIQUE_MAX_LENGTH = 60;
const CHARACTERIZATION_NOTE_MAX_LENGTH = 500;

export const characterizationFormSchema = z.object({
  technique: z
    .string()
    .trim()
    .min(1, { error: 'techniqueRequired' satisfies CharacterizationFormError })
    .max(TECHNIQUE_MAX_LENGTH, {
      error: 'techniqueTooLong' satisfies CharacterizationFormError
    }),
  /** Empty means not recorded. */
  measuredOn: z
    .string()
    .trim()
    .refine(value => value === '' || isCalendarDate(value), {
      error: 'dateInvalid' satisfies CharacterizationFormError
    }),
  note: z
    .string()
    .trim()
    .max(CHARACTERIZATION_NOTE_MAX_LENGTH, {
      error: 'noteTooLong' satisfies CharacterizationFormError
    })
});

export type CharacterizationFormValues = z.infer<
  typeof characterizationFormSchema
>;

/**
 * Narrows a Zod error message to a known translation key.
 *
 * @param message - Message reported by {@link characterizationFormSchema}.
 */
export const isCharacterizationFormError = (
  message: string | undefined
): message is CharacterizationFormError =>
  CHARACTERIZATION_FORM_ERRORS.some(error => error === message);
