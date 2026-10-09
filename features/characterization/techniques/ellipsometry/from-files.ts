import type { TextFile } from '../edx/from-files';
import { parseSeqfit } from './parse';
import type { SeqfitSummary } from './parse';

/** One dropped fit export: the sample it names, and what was read from it. */
export type SeqfitItem = {
  /** The file name without its extension and `_seqfit`, e.g. `AAA159`. */
  id: string;
  fileName: string;
  /** Null when the file is not a fit export. */
  summary: SeqfitSummary | null;
  reason: string | null;
};

/**
 * Reads every dropped CSV as an ellipsometer fit export. A file that is not
 * one is reported with its reason, never skipped silently.
 *
 * @param files - The dropped `.csv` files, as text.
 */
export const readSeqfitItems = (files: TextFile[]): SeqfitItem[] =>
  files
    .filter(file => file.path.toLowerCase().endsWith('.csv'))
    .map(file => {
      const fileName = file.path.split('/').pop() ?? file.path;
      const parsed = parseSeqfit(file.text);

      return {
        id: fileName.replace(/\.csv$/i, '').replace(/_seqfit$/i, ''),
        fileName,
        summary: parsed.isOk ? parsed.summary : null,
        reason: parsed.isOk ? null : parsed.reason
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
