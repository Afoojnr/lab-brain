import { cellToText } from '@/lib/spreadsheet/cells';
import { columnCells, splitHeaderUnit } from '@/lib/spreadsheet/layout';

import { suggestMapping } from './layout';
import type {
  ColumnTarget,
  ConflictChoice,
  ImportPayload,
  ImportRow,
  ImportTarget,
  ParsedSheet
} from './types';

/** How the user set up the sheet: which row holds the headers, and whether a units row follows. */
export type SheetLayout = {
  /** Zero-based index of the header row. */
  headerRow: number;
  /** Whether the row right under the headers holds units (e.g. "W", "nm"). */
  hasUnitsRow: boolean;
};

/** Index of the first data row. */
const firstDataRow = (layout: SheetLayout) =>
  layout.headerRow + 1 + (layout.hasUnitsRow ? 1 : 0);

const width = (sheet: ParsedSheet) => sheet.rows[0]?.length ?? 0;

/**
 * The header text of each column, trimmed.
 *
 * @param sheet - The chosen sheet.
 * @param layout - Where the headers are.
 */
export const headersOf = (sheet: ParsedSheet, layout: SheetLayout): string[] =>
  Array.from({ length: width(sheet) }, (_unused, column) =>
    cellToText(sheet.rows[layout.headerRow]?.[column])
  );

/** The unit written under each header, when the sheet has a units row. */
export const unitsOf = (sheet: ParsedSheet, layout: SheetLayout): string[] =>
  Array.from({ length: width(sheet) }, (_unused, column) =>
    layout.hasUnitsRow
      ? cellToText(sheet.rows[layout.headerRow + 1]?.[column])
      : ''
  );

/** The cells of the data rows for one column. */
export const dataCells = (
  sheet: ParsedSheet,
  layout: SheetLayout,
  column: number
) => columnCells(sheet.rows.slice(firstDataRow(layout)), -1, column);

/**
 * The first suggestion for what each column becomes. A unit under the header
 * (units row) wins over one written in the header, like "Power (W)".
 *
 * @param sheet - The chosen sheet.
 * @param layout - Where the headers are.
 * @param columns - The target experiment's columns (empty for a new one).
 */
export const initialMapping = (
  sheet: ParsedSheet,
  layout: SheetLayout,
  columns: { id: string; name: string }[]
): ColumnTarget[] => {
  const headers = headersOf(sheet, layout);
  const units = unitsOf(sheet, layout);
  const cellsByColumn = headers.map((_header, column) =>
    dataCells(sheet, layout, column)
  );

  return suggestMapping(headers, columns, cellsByColumn).map(
    (target, column) =>
      target.type === 'newColumn' && units[column]
        ? { ...target, unit: units[column] ?? '' }
        : target
  );
};

type PayloadInput = {
  sheet: ParsedSheet;
  layout: SheetLayout;
  target: ImportTarget;
  mapping: ColumnTarget[];
  dateFormat: ImportPayload['dateFormat'];
  choices: Record<string, ConflictChoice>;
  shouldSkipErrorRows: boolean;
};

/**
 * Turns what the user set up into the plain payload that validation and the
 * server both read: every cell as text, comments by column, sheet row numbers
 * as the spreadsheet shows them.
 */
export const buildPayload = ({
  sheet,
  layout,
  target,
  mapping,
  dateFormat,
  choices,
  shouldSkipErrorRows
}: PayloadInput): ImportPayload => {
  const start = firstDataRow(layout);
  const rows: ImportRow[] = sheet.rows.slice(start).map((cells, offset) => {
    const rowIndex = start + offset;
    const comments: Record<string, string> = {};
    for (const column of cells.keys()) {
      const comment = sheet.comments.get(`${rowIndex}:${column}`);
      if (comment) comments[String(column)] = comment;
    }

    return {
      sheetRow: rowIndex + 1,
      cells: cells.map(cell => cellToText(cell)),
      comments
    };
  });

  return {
    target,
    headers: headersOf(sheet, layout),
    mapping,
    dateFormat,
    rows,
    choices,
    shouldSkipErrorRows
  };
};

/**
 * Name and unit to prefill a new column with, from its header ("Power (W)").
 *
 * @param header - The header text.
 * @param unit - A unit from the units row, which wins when present.
 */
export const newColumnFromHeader = (header: string, unit = '') => {
  const split = splitHeaderUnit(header);

  return { name: split.name, unit: unit || split.unit };
};
