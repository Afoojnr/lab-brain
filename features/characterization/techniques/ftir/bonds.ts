import type { FtirBond, FtirBondInput } from './types';

/** The most bonds the table holds. */
export const MAX_BONDS = 500;

/**
 * The bonds a peak may be, for the user to accept: a range matches when the
 * peak lies inside it, and a single position matches within the tolerance. The
 * closest to a range's middle come first. Nothing is applied automatically.
 *
 * @param position - The peak's wavenumber (cm⁻¹).
 * @param bonds - The user's bond table.
 * @param tolerance - How close a single position must be (cm⁻¹).
 */
export const matchBonds = (
  position: number,
  bonds: FtirBond[],
  tolerance: number
): FtirBond[] =>
  bonds
    .filter(item =>
      item.from === item.to
        ? Math.abs(position - item.from) <= tolerance
        : position >= item.from && position <= item.to
    )
    .sort(
      (a, b) =>
        Math.abs(position - (a.from + a.to) / 2) -
        Math.abs(position - (b.from + b.to) / 2)
    );

/** A bond as the user reads it: "B–C stretch (790–810)", or one position "B–N (1380)". */
export const bondLabel = (
  item: Pick<FtirBond, 'bond' | 'from' | 'to'>
): string =>
  item.from === item.to
    ? `${item.bond} (${item.from})`
    : `${item.bond} (${item.from}–${item.to})`;

export type BondProblem = {
  /** The row in the pasted text or file, counting the header as row 1. */
  row: number;
  reason:
    | 'noHeader'
    | 'missingBond'
    | 'missingFrom'
    | 'notNumber'
    | 'rangeOrder'
    | 'duplicate'
    | 'alreadyThere';
  /** The column name, for `notNumber`. */
  column?: 'From' | 'To';
  /** What was written there, for `notNumber`. */
  value?: string;
};

export type BondRows = { bonds: FtirBondInput[]; problems: BondProblem[] };

type Column = 'bond' | 'from' | 'to' | 'source';

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replaceAll('⁻¹', '-1')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '');

/** The header names each column may be written as (ignoring case, spaces and the unit). */
const ALIASES: Record<Column, string[]> = {
  bond: ['bond', 'label', 'name', 'assignment'],
  from: ['from', 'min', 'start', 'low', 'wavenumberfrom', 'frequencyfrom'],
  to: ['to', 'max', 'end', 'high', 'wavenumberto', 'frequencyto'],
  source: ['source', 'reference', 'ref', 'note']
};

/** Accepts a dot or a comma as the decimal mark; anything else is not a number. */
const toNumber = (text: string): number => {
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(text.trim())) return Number.NaN;

  return Number(text.trim().replace(',', '.'));
};

const key = (item: FtirBondInput) =>
  `${item.bond.trim().toLowerCase()}|${item.from}|${item.to}`;

/**
 * Reads a pasted or imported table into bonds, with a header row that names the
 * columns in any order: Bond and From are required; To is empty for a single
 * position; Source is optional. Nothing is coerced: text in a number column is
 * a problem naming its row and column. A row with a problem is not used.
 *
 * @param table - The cells as text, header first.
 * @param existing - The bonds already in the table, so a repeat is reported.
 */
export const parseBondRows = (
  table: string[][],
  existing: Pick<FtirBond, 'bond' | 'from' | 'to'>[] = []
): BondRows => {
  // Row numbers are the ones the user sees, so a blank line still counts.
  const numbered = table
    .map((cells, offset) => ({ cells, row: offset + 1 }))
    .filter(item => item.cells.some(cell => cell.trim() !== ''));
  const header = numbered[0]?.cells ?? [];
  const body = numbered.slice(1);
  const index = Object.fromEntries(
    (Object.keys(ALIASES) as Column[]).map(column => [
      column,
      header.findIndex(cell => ALIASES[column].includes(normalise(cell)))
    ])
  ) as Record<Column, number>;
  if (index.bond === -1 || index.from === -1) {
    return {
      bonds: [],
      problems: [{ row: numbered[0]?.row ?? 1, reason: 'noHeader' }]
    };
  }

  const taken = new Set(existing.map(item => key({ ...item, source: '' })));
  const seen = new Set<string>();
  const bonds: FtirBondInput[] = [];
  const problems: BondProblem[] = [];
  for (const { cells, row } of body) {
    const text = (column: Column) =>
      index[column] === -1 ? '' : (cells[index[column]] ?? '').trim();
    const bond = text('bond');
    const fromText = text('from');
    const toText = text('to');
    const from = toNumber(fromText);
    const to = toText === '' ? from : toNumber(toText);

    if (bond === '') problems.push({ row, reason: 'missingBond' });
    else if (fromText === '') problems.push({ row, reason: 'missingFrom' });
    else if (Number.isNaN(from)) {
      problems.push({
        row,
        reason: 'notNumber',
        column: 'From',
        value: fromText
      });
    } else if (Number.isNaN(to)) {
      problems.push({ row, reason: 'notNumber', column: 'To', value: toText });
    } else if (from > to) problems.push({ row, reason: 'rangeOrder' });
    else {
      const item = { bond, from, to, source: text('source') };
      if (taken.has(key(item))) problems.push({ row, reason: 'alreadyThere' });
      else if (seen.has(key(item))) problems.push({ row, reason: 'duplicate' });
      else {
        seen.add(key(item));
        bonds.push(item);
      }
    }
  }

  return { bonds, problems };
};

/** The template to download: the header and two made-up example rows are NOT included, so no value looks like data. */
export const BOND_TEMPLATE = 'Bond,From (cm-1),To (cm-1),Source\r\n';
