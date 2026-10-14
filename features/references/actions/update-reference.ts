'use server';

import { revalidatePath } from 'next/cache';

import { updateReference } from '../data/references';
import { normalizeLinkInput } from '../net/safe-fetch';
import { editReferenceSchema, yearOf } from '../schemas';

/**
 * Saves changes to a reference's details and summary, then refreshes the
 * project page. A link is only checked to be a web address or DOI, never
 * fetched. Invalid input only comes from a direct call, so it is ignored.
 */
export const updateReferenceAction = async (
  projectId: string,
  referenceId: string,
  input: unknown
): Promise<boolean> => {
  const parsed = editReferenceSchema.safeParse(input);
  if (!parsed.success) return false;

  const values = parsed.data;
  const url = values.url === '' ? null : normalizeLinkInput(values.url);
  if (values.url !== '' && url === null) return false;

  const reference = await updateReference(projectId, referenceId, {
    title: values.title,
    authors: values.authors === '' ? null : values.authors,
    year: yearOf(values.year),
    url,
    note: values.note === '' ? null : values.note,
    summary: values.summary === '' ? null : values.summary
  });
  if (!reference) return false;

  revalidatePath(`/projects/${projectId}`);

  return true;
};
