'use server';

import { revalidatePath } from 'next/cache';

import { getProjectById } from '@/features/experiments/server';
import { getStorage } from '@/lib/storage';

import { createReference, listReferencesByProject } from '../data/references';
import { extractReadable } from '../extract/html';
import { extractPdf, PdfRefusal } from '../extract/pdf';
import { buildStoredText } from '../extract/stored-text';
import {
  MAX_LINK_BYTES,
  MAX_PDF_BYTES,
  MAX_REFERENCES_PER_PROJECT,
  MAX_TEXT_CHARS
} from '../config/limits';
import { LinkRefusal, normalizeLinkInput, safeFetch } from '../net/safe-fetch';
import { referenceFilePath, referenceTextPath } from '../config/paths';
import { addReferenceSchema, yearOf } from '../schemas';
import type { AddReferenceError, AddReferenceResult } from '../schemas';
import type { Reference } from '../types';

/** A page of text shorter than this has nothing worth keeping. */
const MIN_TEXT_CHARS = 40;

const isPdfBytes = (bytes: Uint8Array) =>
  new TextDecoder('latin1').decode(bytes.slice(0, 5)) === '%PDF-';

const fail = (error: AddReferenceError): AddReferenceResult => ({
  ok: false,
  error
});

const pdfError = (error: unknown): AddReferenceError =>
  error instanceof PdfRefusal
    ? error.reason === 'tooManyPages'
      ? 'tooManyPages'
      : error.reason === 'noText'
        ? 'noText'
        : 'unreadablePdf'
    : 'unreadablePdf';

const linkError = (error: unknown): AddReferenceError =>
  error instanceof LinkRefusal
    ? error.reason === 'invalid'
      ? 'linkInvalid'
      : error.reason === 'blocked'
        ? 'linkBlocked'
        : error.reason === 'tooLarge'
          ? 'linkTooLarge'
          : 'linkFailed'
    : 'linkFailed';

type Extracted = {
  pages: string[];
  hasPages: boolean;
  title: string | null;
  authors: string | null;
  /** The PDF to keep, when there is one. */
  pdf: Uint8Array | null;
  url: string | null;
};

/** Reads the PDF, web page or text the user gave, once. */
const extract = async (
  kind: 'pdf' | 'link' | 'text',
  formData: FormData,
  values: { text: string; url: string }
): Promise<Extracted | AddReferenceResult> => {
  if (kind === 'text') {
    const text = values.text.trim();
    if (text.length < MIN_TEXT_CHARS) return fail('noText');

    return {
      pages: [text.slice(0, MAX_TEXT_CHARS)],
      hasPages: false,
      title: null,
      authors: null,
      pdf: null,
      url: null
    };
  }

  if (kind === 'pdf') {
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) return fail('fileMissing');
    if (file.size > MAX_PDF_BYTES) return fail('fileTooLarge');

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdfBytes(bytes)) return fail('notPdf');

    try {
      const pdf = await extractPdf(bytes);

      return {
        pages: pdf.pages,
        hasPages: true,
        title: pdf.title ?? file.name.replace(/\.pdf$/i, ''),
        authors: pdf.authors,
        pdf: bytes,
        url: null
      };
    } catch (error) {
      return fail(pdfError(error));
    }
  }

  const address = normalizeLinkInput(values.url);
  if (!address) return fail('linkInvalid');

  try {
    const fetched = await safeFetch(address, { maxBytes: MAX_LINK_BYTES });
    const type = fetched.contentType.toLowerCase();

    if (type.includes('application/pdf') || isPdfBytes(fetched.bytes)) {
      const pdf = await extractPdf(fetched.bytes);

      return {
        pages: pdf.pages,
        hasPages: true,
        title: pdf.title,
        authors: pdf.authors,
        pdf: fetched.bytes,
        url: address
      };
    }

    const decoded = new TextDecoder().decode(fetched.bytes);
    if (type.includes('text/html') || type.includes('application/xhtml')) {
      const page = extractReadable(decoded, fetched.url);
      if (page.text.length < MIN_TEXT_CHARS) return fail('noText');

      return {
        pages: [page.text],
        hasPages: false,
        title: page.title,
        authors: page.authors,
        pdf: null,
        url: address
      };
    }
    if (type.includes('text/plain')) {
      if (decoded.trim().length < MIN_TEXT_CHARS) return fail('noText');

      return {
        pages: [decoded.trim()],
        hasPages: false,
        title: null,
        authors: null,
        pdf: null,
        url: address
      };
    }

    return fail('linkUnsupported');
  } catch (error) {
    return fail(
      error instanceof PdfRefusal ? pdfError(error) : linkError(error)
    );
  }
};

const isResult = (
  value: Extracted | AddReferenceResult
): value is AddReferenceResult => 'ok' in value;

/**
 * Adds a reference to a project from a PDF, a link (or DOI) or pasted text.
 * It reads the text once, here, and keeps it in storage, so no question later
 * has to read the file again. It checks that the project exists, that the
 * project is under its limit, and every size and page limit; a link is fetched
 * only through the guarded fetcher. Invalid input only comes from a direct
 * call, so it is ignored.
 *
 * @param projectId - The project to add it to.
 * @param formData - `kind` (`pdf`, `link` or `text`), `title`, `authors`,
 *   `year`, `url`, `note`, and the `file` or `text` the kind needs.
 * @returns The new reference's id, or the reason it was not added.
 */
export const addReferenceAction = async (
  projectId: string,
  formData: FormData
): Promise<AddReferenceResult> => {
  if (!(await getProjectById(projectId))) return fail('invalid');

  const parsed = addReferenceSchema.safeParse({
    kind: formData.get('kind'),
    title: formData.get('title') ?? '',
    authors: formData.get('authors') ?? '',
    year: formData.get('year') ?? '',
    url: formData.get('url') ?? '',
    note: formData.get('note') ?? '',
    text: formData.get('text') ?? ''
  });
  if (!parsed.success) return fail('invalid');
  const values = parsed.data;

  if (
    (await listReferencesByProject(projectId)).length >=
    MAX_REFERENCES_PER_PROJECT
  ) {
    return fail('limitReached');
  }

  const extracted = await extract(values.kind, formData, values);
  if (isResult(extracted)) return extracted;

  const id = crypto.randomUUID();
  const { text, isTruncated } = buildStoredText(
    extracted.pages,
    extracted.hasPages
  );
  const storage = getStorage();
  const textPath = referenceTextPath(projectId, id);
  const filePath = extracted.pdf ? referenceFilePath(projectId, id) : null;
  try {
    await storage.upload(textPath, new TextEncoder().encode(text));
    if (filePath && extracted.pdf)
      await storage.upload(filePath, extracted.pdf);
  } catch {
    return fail('unexpected');
  }

  const reference: Reference = {
    id,
    projectId,
    kind: values.kind,
    title:
      values.title ||
      extracted.title?.slice(0, 200) ||
      extracted.url ||
      'Untitled',
    authors: values.authors || extracted.authors,
    year: yearOf(values.year),
    url: values.url
      ? (normalizeLinkInput(values.url) ?? values.url)
      : extracted.url,
    note: values.note || null,
    summary: null,
    filePath,
    textPath,
    pageCount: extracted.hasPages ? extracted.pages.length : null,
    characters: text.length,
    isTruncated,
    createdAt: new Date()
  };
  await createReference(reference);
  revalidatePath(`/projects/${projectId}`);

  return { ok: true, id };
};
