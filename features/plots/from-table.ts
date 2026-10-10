import { cellToText, isBlank } from '@/lib/spreadsheet/cells';
import { splitHeaderUnit } from '@/lib/spreadsheet/layout';
import type { ParsedSheet, RawCell } from '@/lib/spreadsheet/types';
import { parseDecimal } from '@/lib/numbers';

import type { PlotColumn, PlotRow } from './types';

/**
 * Text that means "no value here" in a column of numbers (a lab sheet often has
 * "n/a" or "-"). It is read as not recorded: left out of the plot and counted,
 * never as 0.
 */
const BLANK_MARKERS = ['n/a', 'na', 'nan', 'none', 'null', '-', '–', '—', '?'];

const isMarker = (text: string) =>
  BLANK_MARKERS.includes(text.trim().toLowerCase());

/** A cell as a number, or null when it is not one (including blank markers). */
const cellNumber = (cell: RawCell | undefined): number | null => {
  if (!cell) return null;
  if (cell.kind === 'number') return cell.value;
  if (cell.kind === 'text') return parseDecimal(cell.value);

  return null;
};

export type PlotTable = { columns: PlotColumn[]; rows: PlotRow[] };

/**
 * Reads a sheet as a table to plot: the header row names the columns (with a
 * unit when written like "Power (W)"), a column of numbers is one that can go on
 * an axis, and every other column is text (usable for grouping). A column that
 * has any text that is not a number or a blank marker is a text column, so a
 * word is never read as a number.
 *
 * @param sheet - The parsed sheet.
 * @param headerRow - Zero-based index of the header row.
 */
export const tableFromSheet = (
  sheet: ParsedSheet,
  headerRow: number
): PlotTable => {
  const header = sheet.rows[headerRow] ?? [];
  const body = sheet.rows.slice(headerRow + 1);
  const columns: (PlotColumn & { index: number })[] = [];

  for (const [index, cell] of header.entries()) {
    const cells = body.map(row => row[index]);
    const filled = cells.filter(item => !isBlank(item));
    if (filled.length === 0) continue;

    const isNumeric =
      filled.some(item => cellNumber(item) !== null) &&
      filled.every(
        item =>
          cellNumber(item) !== null ||
          (item?.kind === 'text' && isMarker(item.value))
      );
    const { name, unit } = splitHeaderUnit(cellToText(cell));
    columns.push({
      index,
      key: `col${index}`,
      name: name === '' ? `Column ${index + 1}` : name,
      unit: unit === '' ? null : unit,
      kind: isNumeric ? 'number' : 'text'
    });
  }

  const labelColumn = columns.find(column => column.kind === 'text');
  const rows: PlotRow[] = [];
  for (const [offset, row] of body.entries()) {
    if (row.every(cell => isBlank(cell))) continue;

    const values: PlotRow['values'] = {};
    for (const column of columns) {
      const cell = row[column.index];
      if (column.kind === 'number') {
        const value = cellNumber(cell);
        if (value !== null) values[column.key] = value;
      } else if (!isBlank(cell)) {
        values[column.key] = cellToText(cell);
      }
    }

    const label = labelColumn ? values[labelColumn.key] : undefined;
    rows.push({
      id: String(headerRow + 1 + offset),
      label:
        typeof label === 'string' ? label : `Row ${headerRow + 2 + offset}`,
      href: null,
      values,
      groups: []
    });
  }

  return {
    columns: columns.map(({ index: _index, ...column }) => column),
    rows
  };
};
