import * as XLSX from 'xlsx';

import type { ImportParser, ParsedSheet, RawCell } from '../types';

const EXCEL_EXTENSIONS = ['.xlsx', '.xlsm', '.xls'];

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Reads one worksheet cell. Dates are recognised by their number format and
 * turned into calendar dates from the Excel serial number directly, so no time
 * zone can shift them by a day. Formulas come back as the value Excel last
 * calculated; nothing is evaluated here.
 */
const readCell = (cell: XLSX.CellObject | undefined): RawCell => {
  if (!cell || cell.v === undefined || cell.v === null) {
    return { kind: 'empty' };
  }

  if (cell.t === 'n' && typeof cell.v === 'number') {
    if (cell.z && XLSX.SSF.is_date(String(cell.z))) {
      const parts = XLSX.SSF.parse_date_code(cell.v);
      if (parts) {
        return {
          kind: 'date',
          value: `${parts.y}-${pad(parts.m)}-${pad(parts.d)}`
        };
      }
    }
    return { kind: 'number', value: cell.v };
  }

  // Text, booleans and error values stay text, so a number column rejects them
  // instead of turning them into a number.
  const text = (cell.w ?? String(cell.v)).trim();
  return text === '' ? { kind: 'empty' } : { kind: 'text', value: text };
};

/**
 * Reads every sheet of a workbook held in memory.
 *
 * @param data - The bytes of an .xlsx or .xls file.
 */
export const parseExcelBuffer = (data: ArrayBuffer): ParsedSheet[] => {
  const header = new Uint8Array(data.slice(0, 4));
  const isZip = header[0] === 0x50 && header[1] === 0x4b;
  const isOle = header[0] === 0xd0 && header[1] === 0xcf;
  // SheetJS would read any bytes as a text sheet; only real workbooks pass.
  if (!isZip && !isOle) throw new Error('Not an Excel workbook');

  // cellNF keeps each cell's number format, which is how dates are recognised.
  const workbook = XLSX.read(data, { type: 'array', cellNF: true });

  return workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const reference = sheet?.['!ref'];
    if (!sheet || !reference) {
      return { name, rows: [], comments: new Map<string, string>() };
    }

    const range = XLSX.utils.decode_range(reference);
    const rows: RawCell[][] = [];
    const comments = new Map<string, string>();

    for (let row = range.s.r; row <= range.e.r; row += 1) {
      const cells: RawCell[] = [];
      for (let column = range.s.c; column <= range.e.c; column += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })] as
          XLSX.CellObject | undefined;
        cells.push(readCell(cell));

        const comment = cell?.c?.map(item => item.t.trim()).join('\n');
        if (comment) {
          comments.set(`${row - range.s.r}:${column - range.s.c}`, comment);
        }
      }
      rows.push(cells);
    }

    return { name, rows, comments };
  });
};

export const excelParser: ImportParser = {
  accepts: file =>
    EXCEL_EXTENSIONS.some(extension =>
      file.name.toLowerCase().endsWith(extension)
    ),
  parse: async file => parseExcelBuffer(await file.arrayBuffer())
};
