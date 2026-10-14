import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from 'next/cache';

import { listBonds, replaceBonds } from '../data/ftir-bonds';
import {
  deleteBondAction,
  importBondsAction,
  saveBondAction
} from './ftir-bonds';

// Made-up rows for tests only: not real assignments.
const A = { bond: 'Range A', from: 790, to: 810, source: 'test' };
const B = { bond: 'Single B', from: 1390, to: 1390, source: '' };

beforeEach(async () => {
  await replaceBonds([]);
  vi.clearAllMocks();
});

describe('saveBondAction', () => {
  it('adds a bond, keeps the list lowest first, and refreshes the pages', async () => {
    expect(await saveBondAction(B)).toEqual({ ok: true });
    expect(await saveBondAction(A)).toEqual({ ok: true });

    expect((await listBonds()).map(item => item.bond)).toEqual([
      'Range A',
      'Single B'
    ]);
    expect(revalidatePath).toHaveBeenCalledWith('/characterization/ftir');
  });

  it('refuses invalid input, naming nothing it should not', async () => {
    for (const bad of [
      { ...A, bond: '  ' },
      { ...A, from: 900, to: 800 },
      { ...A, from: 'about 800' },
      { ...A, source: 'x'.repeat(201) },
      { bond: 'No numbers' }
    ]) {
      expect(await saveBondAction(bad)).toEqual({
        ok: false,
        error: 'invalid'
      });
    }
    expect(await listBonds()).toEqual([]);
  });

  it('does not let the same bond and range be in the table twice', async () => {
    await saveBondAction(A);

    expect(await saveBondAction({ ...A, bond: 'range a' })).toEqual({
      ok: false,
      error: 'duplicate'
    });
    expect(await listBonds()).toHaveLength(1);
  });

  it('changes a bond by id, and says when there is none', async () => {
    await saveBondAction(A);
    const [stored] = await listBonds();

    expect(await saveBondAction({ ...A, to: 820 }, stored.id)).toEqual({
      ok: true
    });
    expect((await listBonds())[0]).toMatchObject({ id: stored.id, to: 820 });
    expect(await saveBondAction(A, 'missing')).toEqual({
      ok: false,
      error: 'notFound'
    });
  });
});

describe('deleteBondAction', () => {
  it('removes one bond and reports when there is nothing to remove', async () => {
    await saveBondAction(A);
    const [stored] = await listBonds();

    expect(await deleteBondAction(stored.id)).toBe(true);
    expect(await listBonds()).toEqual([]);
    expect(await deleteBondAction(stored.id)).toBe(false);
  });
});

describe('importBondsAction', () => {
  it('adds to the table by default and keeps what is already there', async () => {
    await saveBondAction(A);

    expect(await importBondsAction({ mode: 'add', bonds: [B] })).toEqual({
      ok: true,
      count: 1
    });
    expect(await listBonds()).toHaveLength(2);
  });

  it('replaces the table only when asked to', async () => {
    await saveBondAction(A);

    await importBondsAction({ mode: 'replace', bonds: [B] });

    expect((await listBonds()).map(item => item.bond)).toEqual(['Single B']);
  });

  it('refuses the whole import, saving nothing, when a row repeats one in the table or in itself', async () => {
    await saveBondAction(A);

    expect(await importBondsAction({ mode: 'add', bonds: [A, B] })).toEqual({
      ok: false,
      error: 'duplicate'
    });
    expect(await importBondsAction({ mode: 'add', bonds: [B, B] })).toEqual({
      ok: false,
      error: 'duplicate'
    });
    expect(await listBonds()).toHaveLength(1);
  });

  it('refuses more than 500 bonds and an empty or invalid import', async () => {
    const many = Array.from({ length: 501 }, (_, index) => ({
      bond: `B${index}`,
      from: index,
      to: index,
      source: ''
    }));

    expect(await importBondsAction({ mode: 'add', bonds: many })).toEqual({
      ok: false,
      error: 'invalid'
    });
    expect(await importBondsAction({ mode: 'add', bonds: [] })).toEqual({
      ok: false,
      error: 'invalid'
    });
    expect(await importBondsAction({ mode: 'merge', bonds: [A] })).toEqual({
      ok: false,
      error: 'invalid'
    });
  });

  it('refuses an addition that would pass the limit', async () => {
    const fill = Array.from({ length: 500 }, (_, index) => ({
      bond: `B${index}`,
      from: index,
      to: index,
      source: ''
    }));
    await importBondsAction({ mode: 'replace', bonds: fill });

    expect(await importBondsAction({ mode: 'add', bonds: [A] })).toEqual({
      ok: false,
      error: 'tooMany'
    });
    expect(await saveBondAction(A)).toEqual({ ok: false, error: 'tooMany' });
  });
});
