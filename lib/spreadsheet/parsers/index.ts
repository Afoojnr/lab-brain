import { MAX_FILE_BYTES, MAX_ROWS } from '../limits';
import type { ImportParser, ParseResult } from '../types';
import { csvParser } from './csv-parser';
import { excelParser } from './excel-parser';

const PARSERS: ImportParser[] = [excelParser, csvParser];

/**
 * Reads a chosen file with the parser for its format. Files that are too big,
 * have too many rows, or cannot be read come back as a reason, never as a
 * thrown error, so the wizard can show a translated message.
 *
 * @param file - The file the user picked.
 */
export const parseSpreadsheet = async (file: File): Promise<ParseResult> => {
  const parser = PARSERS.find(candidate => candidate.accepts(file));
  if (!parser) return { isOk: false, failure: 'unsupportedType' };
  if (file.size > MAX_FILE_BYTES) return { isOk: false, failure: 'tooLarge' };

  try {
    const sheets = await parser.parse(file);
    if (sheets.some(sheet => sheet.rows.length > MAX_ROWS)) {
      return { isOk: false, failure: 'tooManyRows' };
    }
    return { isOk: true, sheets };
  } catch {
    return { isOk: false, failure: 'unreadable' };
  }
};
