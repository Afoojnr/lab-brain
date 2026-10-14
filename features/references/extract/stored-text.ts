import { MAX_TEXT_CHARS } from '../config/limits';

const CUT_NOTE =
  '\n\n[The rest of this text was left out: the length limit was reached.]';

/** The text kept for a reference. */
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

/** A slice of a stored text, for reading part of a reference. */
export const readSlice = (text: string, from: number, length: number) => ({
  text: text.slice(Math.max(from, 0), Math.max(from, 0) + length),
  from: Math.max(from, 0),
  totalCharacters: text.length
});
