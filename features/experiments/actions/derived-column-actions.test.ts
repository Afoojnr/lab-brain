import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/parameter-definitions', () => ({
  deleteParameterDefinition: vi.fn(),
  listParameterDefinitions: vi.fn(),
  updateParameterDefinition: vi.fn()
}));
vi.mock('../data/samples', () => ({ isParameterInUse: vi.fn() }));
vi.mock('../data/derived-columns', () => ({
  createDerivedColumn: vi.fn(),
  deleteDerivedColumn: vi.fn(),
  listDerivedColumns: vi.fn(),
  listDerivedColumnsUsing: vi.fn(),
  updateDerivedColumn: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import {
  createDerivedColumn,
  deleteDerivedColumn,
  listDerivedColumns,
  listDerivedColumnsUsing,
  updateDerivedColumn
} from '../data/derived-columns';
import { getExperimentInProject } from '../data/experiments';
import {
  deleteParameterDefinition,
  listParameterDefinitions,
  updateParameterDefinition
} from '../data/parameter-definitions';
import { isParameterInUse } from '../data/samples';
import type { ParameterDefinition } from '../types';
import { createDerivedColumnAction } from './create-derived-column';
import { deleteDerivedColumnAction } from './delete-derived-column';
import { deleteParameterDefinitionAction } from './delete-parameter-definition';
import { updateDerivedColumnAction } from './update-derived-column';
import { updateParameterDefinitionAction } from './update-parameter-definition';

const column = (
  id: string,
  name: string,
  kind: 'number' | 'text'
): ParameterDefinition => ({
  id,
  experimentId: 'experiment-1',
  name,
  unit: null,
  kind,
  role: 'parameter',
  defaultValue: null,
  position: 0
});
const THICKNESS = column('thickness', 'Thickness', 'number');
const CYCLES = column('cycles', 'Cycles', 'number');
const SUBSTRATE = column('substrate', 'Substrate', 'text');
const GPC = {
  id: 'gpc',
  experimentId: 'experiment-1',
  name: 'GPC',
  unit: 'Å/cycle',
  formula: '[#thickness] * 10 / [#cycles]',
  position: 0
};
const PAGE = '/projects/project-1/experiments/experiment-1';
const FORM = {
  name: ' Growth ',
  unit: ' Å/cycle ',
  formula: '[thickness] * 10 / [Cycles]'
};

beforeEach(() => {
  vi.mocked(getExperimentInProject).mockResolvedValue({
    id: 'experiment-1'
  } as never);
  vi.mocked(listParameterDefinitions).mockResolvedValue([
    THICKNESS,
    CYCLES,
    SUBSTRATE
  ]);
  vi.mocked(listDerivedColumns).mockResolvedValue([GPC]);
  vi.mocked(listDerivedColumnsUsing).mockResolvedValue([]);
  vi.mocked(isParameterInUse).mockResolvedValue(false);
});

describe('createDerivedColumnAction', () => {
  const run = (input: unknown) =>
    createDerivedColumnAction('project-1', 'experiment-1', input);

  it('adds a column, stores its formula by column id and refreshes the page', async () => {
    expect(await run(FORM)).toBe(true);

    expect(createDerivedColumn).toHaveBeenCalledWith('experiment-1', {
      name: 'Growth',
      unit: 'Å/cycle',
      formula: '[#thickness] * 10 / [#cycles]'
    });
    expect(revalidatePath).toHaveBeenCalledWith(PAGE);
  });

  it.each([
    [
      'a name already used by an entered column',
      { ...FORM, name: 'thickness' }
    ],
    ['a name already used by a calculated column', { ...FORM, name: 'gpc' }],
    ['an empty name', { ...FORM, name: ' ' }],
    [
      'a formula using a column that does not exist',
      { ...FORM, formula: '[Nope] * 2' }
    ],
    ['a formula using a text column', { ...FORM, formula: '[Substrate] * 2' }],
    ['a formula that does not parse', { ...FORM, formula: '[Thickness] *' }],
    ['an empty formula', { ...FORM, formula: '' }]
  ])('ignores %s', async (_name, input) => {
    expect(await run(input)).toBe(false);
    expect(createDerivedColumn).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, 'not an object'])(
    'ignores garbage %j',
    async input => {
      expect(await run(input)).toBe(false);
    }
  );

  it('ignores an experiment that is not in the project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);

    expect(await run(FORM)).toBe(false);
    expect(createDerivedColumn).not.toHaveBeenCalled();
  });
});

describe('updateDerivedColumnAction', () => {
  const run = (id: string, input: unknown) =>
    updateDerivedColumnAction('project-1', 'experiment-1', id, input);

  it('changes the column and lets it keep its own name', async () => {
    expect(await run('gpc', { ...FORM, name: 'GPC' })).toBe(true);

    expect(updateDerivedColumn).toHaveBeenCalledWith(
      'experiment-1',
      'gpc',
      expect.objectContaining({
        name: 'GPC',
        formula: '[#thickness] * 10 / [#cycles]'
      })
    );
  });

  it('ignores an unknown column and an invalid formula', async () => {
    expect(await run('ghost', FORM)).toBe(false);
    expect(await run('gpc', { ...FORM, formula: '[Nope]' })).toBe(false);
    expect(updateDerivedColumn).not.toHaveBeenCalled();
  });
});

describe('deleteDerivedColumnAction', () => {
  it('removes the column and refreshes the page', async () => {
    vi.mocked(deleteDerivedColumn).mockResolvedValue(true);

    expect(
      await deleteDerivedColumnAction('project-1', 'experiment-1', 'gpc')
    ).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith(PAGE);
  });

  it('ignores an unknown column', async () => {
    vi.mocked(deleteDerivedColumn).mockResolvedValue(false);

    expect(
      await deleteDerivedColumnAction('project-1', 'experiment-1', 'ghost')
    ).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('columns used by a calculated column', () => {
  it('cannot be deleted while a formula uses them', async () => {
    vi.mocked(listDerivedColumnsUsing).mockResolvedValue([GPC]);

    expect(
      await deleteParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'thickness'
      )
    ).toBe(false);
    expect(deleteParameterDefinition).not.toHaveBeenCalled();
  });

  it('cannot be turned into text while a formula uses them', async () => {
    vi.mocked(listDerivedColumnsUsing).mockResolvedValue([GPC]);

    const input = {
      name: 'Thickness',
      unit: '',
      kind: 'text',
      role: 'parameter',
      defaultValue: ''
    };
    expect(
      await updateParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'thickness',
        input
      )
    ).toBe(false);
    expect(updateParameterDefinition).not.toHaveBeenCalled();
  });

  it('can still be renamed, because the formula follows the column id', async () => {
    vi.mocked(listDerivedColumnsUsing).mockResolvedValue([GPC]);

    const input = {
      name: 'Film thickness',
      unit: 'nm',
      kind: 'number',
      role: 'parameter',
      defaultValue: ''
    };
    expect(
      await updateParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'thickness',
        input
      )
    ).toBe(true);
  });
});
