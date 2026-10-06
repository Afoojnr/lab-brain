/**
 * One spreadsheet cell as it was read. Nothing is converted silently: a number
 * stays a number, a date stays a calendar date, and anything else stays the
 * text it was.
 */
export type RawCell =
  | { kind: 'empty' }
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: number }
  /** A calendar date as `YYYY-MM-DD`, with no time zone. */
  | { kind: 'date'; value: string };

/** One sheet of a workbook, or the single table of a CSV file. */
export type ParsedSheet = {
  name: string;
  /** Every row padded to the same width. */
  rows: RawCell[][];
  /** Cell comments (Excel only), keyed `"<row>:<column>"`, both zero-based. */
  comments: Map<string, string>;
};

/** Why a file could not be read, as a key under `import.errors`. */
export type ParseFailure =
  'unsupportedType' | 'tooLarge' | 'tooManyRows' | 'unreadable';

export type ParseResult =
  | { isOk: true; sheets: ParsedSheet[] }
  | { isOk: false; failure: ParseFailure };

/** Every file format implements this; mapping, validation and preview never know the source format. */
export type ImportParser = {
  accepts: (file: File) => boolean;
  parse: (file: File) => Promise<ParsedSheet[]>;
};

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
