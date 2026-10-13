/** How many references one project can hold. */
export const MAX_REFERENCES_PER_PROJECT = 10;
/** The largest PDF that can be added. */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
/** The most pages a PDF can have. */
export const MAX_PDF_PAGES = 150;
/** The most text kept for one reference; longer text is cut and marked. */
export const MAX_TEXT_CHARS = 300_000;
/** The largest web page or file fetched from a link. */
export const MAX_LINK_BYTES = 10 * 1024 * 1024;
export const LINK_TIMEOUT_MS = 10_000;
export const MAX_REDIRECTS = 5;
/** How much of a reference's text is read to write its summary. */
export const SUMMARY_SOURCE_CHARS = 24_000;
