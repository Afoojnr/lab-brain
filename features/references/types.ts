export type ReferenceKind = 'pdf' | 'link' | 'text';

/**
 * A paper or note that gives the AI assistant background on a project. The
 * file (a PDF) and the text read from it live in storage, read once when the
 * reference is added, never again for each question.
 */
export type Reference = {
  id: string;
  projectId: string;
  kind: ReferenceKind;
  title: string;
  authors: string | null;
  year: number | null;
  /** Where it came from (a link or DOI), or null for an uploaded or pasted one. */
  url: string | null;
  /** Why it matters for this project, in the user's own words. */
  note: string | null;
  /** A short summary of its key points, written once (by the AI on request) and editable; null when none. */
  summary: string | null;
  /** The original PDF in storage, or null when there is none (a web page or pasted text). */
  filePath: string | null;
  /** The text read from it, in storage. */
  textPath: string;
  pageCount: number | null;
  /** How long the stored text is. */
  characters: number;
  /** The text was cut at the length limit. */
  isTruncated: boolean;
  createdAt: Date;
};
