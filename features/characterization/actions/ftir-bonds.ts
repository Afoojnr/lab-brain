'use server';

import { revalidatePath } from 'next/cache';

import {
  addBonds,
  deleteBond,
  listBonds,
  replaceBonds,
  updateBond
} from '../data/ftir-bonds';
import { ftirBondImportSchema, ftirBondSchema } from '../schemas';
import { MAX_BONDS, parseBondRows } from '../techniques/ftir/bonds';

export type BondActionResult =
  | { ok: true }
  | { ok: false; error: 'invalid' | 'notFound' | 'tooMany' | 'duplicate' };

/** Every page that shows bond suggestions is refreshed after the table changes. */
const refresh = () => {
  revalidatePath('/characterization/ftir');
  revalidatePath(
    '/projects/[projectId]/experiments/[experimentId]/samples/[sampleId]/characterizations/[characterizationId]',
    'page'
  );
};

/**
 * Adds a bond to the table, or changes one when an id is given. Invalid input
 * only comes from a direct call, so it is refused.
 */
export const saveBondAction = async (
  input: unknown,
  id?: string
): Promise<BondActionResult> => {
  const parsed = ftirBondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const current = await listBonds();
  const key = (item: { bond: string; from: number; to: number }) =>
    `${item.bond.toLowerCase()}|${item.from}|${item.to}`;
  if (current.some(item => item.id !== id && key(item) === key(parsed.data))) {
    return { ok: false, error: 'duplicate' };
  }

  if (id === undefined) {
    if (current.length >= MAX_BONDS) return { ok: false, error: 'tooMany' };
    await addBonds([parsed.data]);
  } else if (!(await updateBond(id, parsed.data))) {
    return { ok: false, error: 'notFound' };
  }
  refresh();

  return { ok: true };
};

/** Removes a bond. Labels already written on peaks stay as they are. */
export const deleteBondAction = async (id: string): Promise<boolean> => {
  const isDeleted = await deleteBond(id);
  if (isDeleted) refresh();

  return isDeleted;
};

/**
 * Adds the imported bonds to the table, or replaces the table with them.
 * Replace is only done when asked for.
 */
export const importBondsAction = async (
  input: unknown
): Promise<BondActionResult & { count?: number }> => {
  const parsed = ftirBondImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { mode, bonds } = parsed.data;

  const current = mode === 'add' ? await listBonds() : [];
  if (current.length + bonds.length > MAX_BONDS) {
    return { ok: false, error: 'tooMany' };
  }
  // Reuse the parser's own repeat rules: one source of truth.
  const rows = [
    ['Bond', 'From', 'To', 'Source'],
    ...bonds.map(item => [
      item.bond,
      String(item.from),
      String(item.to),
      item.source
    ])
  ];
  if (parseBondRows(rows, current).problems.length > 0) {
    return { ok: false, error: 'duplicate' };
  }

  if (mode === 'replace') await replaceBonds(bonds);
  else await addBonds(bonds);
  refresh();

  return { ok: true, count: bonds.length };
};
