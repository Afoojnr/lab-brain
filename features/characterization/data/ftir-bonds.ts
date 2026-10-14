import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { ftirBonds } from '@/lib/db/schema';

import type { FtirBond, FtirBondInput } from '../techniques/ftir/types';

type BondRow = typeof ftirBonds.$inferSelect;

const toBond = (row: BondRow): FtirBond => ({
  id: row.id,
  bond: row.bond,
  from: row.rangeFrom,
  to: row.rangeTo,
  source: row.source
});

const toRow = (input: FtirBondInput) => ({
  bond: input.bond,
  rangeFrom: input.from,
  rangeTo: input.to,
  source: input.source
});

/** The user's FTIR bond table, lowest wavenumber first. */
export const listBonds = async (): Promise<FtirBond[]> => {
  const db = await getDb();
  const rows = await db.select().from(ftirBonds);

  return rows
    .map(toBond)
    .sort((a, b) => a.from - b.from || a.bond.localeCompare(b.bond));
};

/**
 * Adds bonds to the table.
 *
 * @param inputs - The bonds to add, already validated.
 * @returns The stored bonds, with their ids.
 */
export const addBonds = async (
  inputs: FtirBondInput[]
): Promise<FtirBond[]> => {
  if (inputs.length === 0) return [];

  const db = await getDb();
  const rows = await db
    .insert(ftirBonds)
    .values(inputs.map(input => ({ id: crypto.randomUUID(), ...toRow(input) })))
    .returning();

  return rows.map(toBond);
};

/**
 * Changes one bond.
 *
 * @returns The changed bond, or undefined when there is none with that id.
 */
export const updateBond = async (
  id: string,
  input: FtirBondInput
): Promise<FtirBond | undefined> => {
  const db = await getDb();
  const [row] = await db
    .update(ftirBonds)
    .set(toRow(input))
    .where(eq(ftirBonds.id, id))
    .returning();

  return row ? toBond(row) : undefined;
};

/** Removes one bond; false when there is none with that id. */
export const deleteBond = async (id: string): Promise<boolean> => {
  const db = await getDb();
  const removed = await db
    .delete(ftirBonds)
    .where(eq(ftirBonds.id, id))
    .returning({ id: ftirBonds.id });

  return removed.length > 0;
};

/** Replaces the whole table. */
export const replaceBonds = async (
  inputs: FtirBondInput[]
): Promise<FtirBond[]> => {
  const db = await getDb();
  await db.delete(ftirBonds);

  return addBonds(inputs);
};
