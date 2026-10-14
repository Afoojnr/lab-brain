import type { FtirBond, FtirBondInput } from '../techniques/ftir/types';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
// On `globalThis` for the same reason as the other lists: bundles of pages and
// actions must see one copy.
const store = globalThis as { __labBrainFtirBonds?: FtirBond[] };
const bonds: FtirBond[] = (store.__labBrainFtirBonds ??= []);

/** The user's FTIR bond table, lowest wavenumber first. */
export const listBonds = async (): Promise<FtirBond[]> =>
  [...bonds].sort((a, b) => a.from - b.from || a.bond.localeCompare(b.bond));

export const addBonds = async (
  inputs: FtirBondInput[]
): Promise<FtirBond[]> => {
  const added = inputs.map(input => ({ ...input, id: crypto.randomUUID() }));
  bonds.push(...added);

  return added;
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
  const bond = bonds.find(item => item.id === id);
  if (!bond) return undefined;

  Object.assign(bond, input);

  return bond;
};

/** Removes one bond; false when there is none with that id. */
export const deleteBond = async (id: string): Promise<boolean> => {
  const index = bonds.findIndex(item => item.id === id);
  if (index === -1) return false;

  bonds.splice(index, 1);

  return true;
};

/** Replaces the whole table. */
export const replaceBonds = async (
  inputs: FtirBondInput[]
): Promise<FtirBond[]> => {
  bonds.splice(0, bonds.length);

  return addBonds(inputs);
};
