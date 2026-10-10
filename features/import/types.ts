// The spreadsheet types live in `lib/spreadsheet`; they are re-exported so the
// import's own files keep reading them from here.
export type {
  ImportParser,
  ParseFailure,
  ParseResult,
  ParsedSheet,
  RawCell
} from '@/lib/spreadsheet/types';
import type { ParsedSheet } from '@/lib/spreadsheet/types';

export type NewColumnTarget = {
  type: 'newColumn';
  name: string;
  unit: string;
  kind: 'number' | 'text';
  role: 'parameter' | 'result';
};

/** What one source column becomes. */
export type ColumnTarget =
  | { type: 'ignore' }
  | { type: 'code' }
  | { type: 'date' }
  | { type: 'implementation' }
  | { type: 'observation' }
  | { type: 'note' }
  | { type: 'studies' }
  | { type: 'column'; columnId: string }
  | NewColumnTarget;

export const cellComment = (
  sheet: Pick<ParsedSheet, 'comments'>,
  row: number,
  column: number
): string | undefined => sheet.comments.get(`${row}:${column}`);

/** The experiment an import writes to. */
export type ImportTarget =
  | { type: 'new'; name: string; codePrefix: string; protocol: string }
  | { type: 'existing'; experimentId: string };

/** What to do with a row whose code already exists. Skipping is the default. */
export type ConflictChoice =
  | { action: 'update' }
  | { action: 'skip' }
  | { action: 'addAsNew'; code: string };

/** One sheet row as plain strings, ready to send to the server. */
export type ImportRow = {
  /** One-based, as the spreadsheet shows it. */
  sheetRow: number;
  cells: string[];
  /** Cell comments by zero-based column index. */
  comments: Record<string, string>;
};

/** Everything an import needs, as plain data (sent to the server unchanged). */
export type ImportPayload = {
  target: ImportTarget;
  headers: string[];
  mapping: ColumnTarget[];
  dateFormat: 'iso' | 'dmy' | 'mdy';
  rows: ImportRow[];
  /** Choices for conflicting rows, by sheet row. */
  choices: Record<string, ConflictChoice>;
  shouldSkipErrorRows: boolean;
};
