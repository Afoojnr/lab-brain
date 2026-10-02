import { z } from 'zod';

/** Keys under `projects.form.errors` in `messages/<locale>/projects.json`; Zod reports these, the UI translates them. */
export const PROJECT_FORM_ERRORS = [
  'nameRequired',
  'nameTooLong',
  'codePrefixInvalid',
  'protocolTooLong'
] as const;

export type ProjectFormError = (typeof PROJECT_FORM_ERRORS)[number];

const PROJECT_NAME_MAX_LENGTH = 80;
const PROTOCOL_MAX_LENGTH = 500;

/** A letter, then 1-5 uppercase letters or digits (e.g. `EXP`, `B2`). */
const CODE_PREFIX_PATTERN = /^[A-Z][A-Z0-9]{1,5}$/;

export const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'nameRequired' satisfies ProjectFormError })
    .max(PROJECT_NAME_MAX_LENGTH, {
      error: 'nameTooLong' satisfies ProjectFormError
    }),
  codePrefix: z
    .string()
    .trim()
    .regex(CODE_PREFIX_PATTERN, {
      error: 'codePrefixInvalid' satisfies ProjectFormError
    }),
  protocol: z
    .string()
    .trim()
    .max(PROTOCOL_MAX_LENGTH, {
      error: 'protocolTooLong' satisfies ProjectFormError
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
