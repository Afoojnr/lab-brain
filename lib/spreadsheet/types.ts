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
