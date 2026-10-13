import { MAX_TEXT_CHARS } from '../config/limits';

const CUT_NOTE =
  '\n\n[The rest of this text was left out: the length limit was reached.]';

/**
 * The text kept for a reference. A PDF's pages are separated by `[Page N]`
 * lines, so a passage can be cited with its page; pasted text and web pages
 * (one "page") get no marks. Text over the limit is cut and says so.
 *
 * @param pages - The text of each page, or one entry for text without pages.
 * @param hasPages - Whether to mark the pages.
 */
export const buildStoredText = (
  pages: string[],
  hasPages: boolean
): { text: string; isTruncated: boolean } => {
  const full = hasPages
    ? pages.map((page, index) => `[Page ${index + 1}]\n${page}`).join('\n\n')
    : pages.join('\n\n');
  if (full.length <= MAX_TEXT_CHARS) return { text: full, isTruncated: false };

  return {
    text: `${full.slice(0, MAX_TEXT_CHARS)}${CUT_NOTE}`,
    isTruncated: true
  };
};

/**
 * A slice of a stored text, for reading part of a reference.
 *
 * @param text - The stored text.
 * @param from - The first character (0-based).
 * @param length - How many characters at most.
 */
export const readSlice = (text: string, from: number, length: number) => ({
  text: text.slice(Math.max(from, 0), Math.max(from, 0) + length),
  from: Math.max(from, 0),
  totalCharacters: text.length
});
