import { z } from 'zod';

import { MAX_TEXT_CHARS } from './config/limits';

/** Keys under `references.errors` in `messages/<locale>/references.json` for a form field. */
export const REFERENCE_FORM_ERRORS = [
  'titleRequired',
  'titleTooLong',
  'authorsTooLong',
  'yearInvalid',
  'urlInvalid',
  'noteTooLong',
  'summaryTooLong'
] as const;

export type ReferenceFormError = (typeof REFERENCE_FORM_ERRORS)[number];

export const REFERENCE_TITLE_MAX_LENGTH = 200;
export const REFERENCE_AUTHORS_MAX_LENGTH = 300;
export const REFERENCE_NOTE_MAX_LENGTH = 2000;
export const REFERENCE_SUMMARY_MAX_LENGTH = 4000;
const URL_MAX_LENGTH = 2000;
const MIN_YEAR = 1800;
const MAX_YEAR = 2100;

const YEAR = z
  .string()
  .trim()
  .refine(
    value =>
      value === '' ||
      (/^\d{4}$/.test(value) &&
        Number(value) >= MIN_YEAR &&
        Number(value) <= MAX_YEAR),
    { error: 'yearInvalid' satisfies ReferenceFormError }
  );

const OPTIONAL_URL = z
  .string()
  .trim()
  .max(URL_MAX_LENGTH, { error: 'urlInvalid' satisfies ReferenceFormError });

const details = {
  authors: z
    .string()
    .trim()
    .max(REFERENCE_AUTHORS_MAX_LENGTH, {
      error: 'authorsTooLong' satisfies ReferenceFormError
    }),
  year: YEAR,
  url: OPTIONAL_URL,
  note: z
    .string()
    .trim()
    .max(REFERENCE_NOTE_MAX_LENGTH, {
      error: 'noteTooLong' satisfies ReferenceFormError
    })
};

/** What is typed when adding a reference. */
export const addReferenceSchema = z.object({
  kind: z.enum(['pdf', 'link', 'text']),
  title: z
    .string()
    .trim()
    .max(REFERENCE_TITLE_MAX_LENGTH, {
      error: 'titleTooLong' satisfies ReferenceFormError
    }),
  ...details,
  text: z.string().max(MAX_TEXT_CHARS * 2)
});

export type AddReferenceValues = z.infer<typeof addReferenceSchema>;

/** The Edit reference form: the details and the summary, all editable. */
export const editReferenceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'titleRequired' satisfies ReferenceFormError })
    .max(REFERENCE_TITLE_MAX_LENGTH, {
      error: 'titleTooLong' satisfies ReferenceFormError
    }),
  ...details,
  summary: z
    .string()
    .trim()
    .max(REFERENCE_SUMMARY_MAX_LENGTH, {
      error: 'summaryTooLong' satisfies ReferenceFormError
    })
});

export type EditReferenceValues = z.infer<typeof editReferenceSchema>;

/** Narrows a Zod error message to a known translation key. */
export const isReferenceFormError = (
  message: string | undefined
): message is ReferenceFormError =>
  REFERENCE_FORM_ERRORS.some(error => error === message);

/** The year as a number, or null when it was left empty. */
export const yearOf = (year: string): number | null =>
  year === '' ? null : Number(year);

/** Why adding a reference did not work; each is a key under `references.errors`. */
export type AddReferenceError =
  | 'invalid'
  | 'limitReached'
  | 'fileMissing'
  | 'fileTooLarge'
  | 'notPdf'
  | 'unreadablePdf'
  | 'tooManyPages'
  | 'noText'
  | 'linkInvalid'
  | 'linkBlocked'
  | 'linkFailed'
  | 'linkTooLarge'
  | 'linkUnsupported'
  | 'unexpected';

export type AddReferenceResult =
  { ok: true; id: string } | { ok: false; error: AddReferenceError };
