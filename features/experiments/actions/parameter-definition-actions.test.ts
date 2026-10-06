import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/experiments', () => ({ getExperimentInProject: vi.fn() }));
vi.mock('../data/parameter-definitions', () => ({
  createParameterDefinition: vi.fn(),
  deleteParameterDefinition: vi.fn(),
  listParameterDefinitions: vi.fn(),
  updateParameterDefinition: vi.fn()
}));
vi.mock('../data/samples', () => ({ isParameterInUse: vi.fn() }));

import { revalidatePath } from 'next/cache';

import {
  createParameterDefinition,
  deleteParameterDefinition,
  listParameterDefinitions,
  updateParameterDefinition
} from '../data/parameter-definitions';
import { isParameterInUse } from '../data/samples';
import { getExperimentInProject } from '../data/experiments';
import type { ParameterDefinition } from '../types';
import { createParameterDefinitionAction } from './create-parameter-definition';
import { deleteParameterDefinitionAction } from './delete-parameter-definition';
import { updateParameterDefinitionAction } from './update-parameter-definition';

const EXPERIMENT = {
  id: 'experiment-1',
  projectId: 'project-1',
  name: 'Deposition',
  codePrefix: 'ALD',
  protocol: null,
  createdAt: new Date()
};
const POWER: ParameterDefinition = {
  id: 'power',
  experimentId: 'experiment-1',
  name: 'Power',
  unit: 'W',
  kind: 'number',
  role: 'parameter',
  defaultValue: null,
  position: 0
};
const PULSE: ParameterDefinition = {
  ...POWER,
  id: 'pulse',
  name: 'Pulse',
  position: 1
};
const PAGE = '/projects/project-1/experiments/experiment-1';

const withStoredParameters = () => {
  vi.mocked(getExperimentInProject).mockResolvedValue(EXPERIMENT);
  vi.mocked(listParameterDefinitions).mockResolvedValue([POWER, PULSE]);
};

describe('createParameterDefinitionAction', () => {
  it('adds a valid parameter and refreshes the experiment page', async () => {
    withStoredParameters();

    const wasAdded = await createParameterDefinitionAction(
      'project-1',
      'experiment-1',
      {
        name: '  Temperature  ',
        unit: '°C',
        kind: 'number',
        role: 'parameter',
        defaultValue: ''
      }
    );

    expect(createParameterDefinition).toHaveBeenCalledWith('experiment-1', {
      name: 'Temperature',
      unit: '°C',
      kind: 'number',
      role: 'parameter',
      defaultValue: null
    });
    expect(revalidatePath).toHaveBeenCalledWith(PAGE);
    expect(wasAdded).toBe(true);
  });

  it('rejects a name the experiment already has, ignoring case', async () => {
    withStoredParameters();

    const wasAdded = await createParameterDefinitionAction(
      'project-1',
      'experiment-1',
      {
        name: 'power',
        unit: '',
        kind: 'number',
        role: 'parameter',
        defaultValue: ''
      }
    );

    expect(wasAdded).toBe(false);
    expect(createParameterDefinition).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, { name: '' }])(
    'ignores garbage input %j',
    async input => {
      withStoredParameters();

      expect(
        await createParameterDefinitionAction(
          'project-1',
          'experiment-1',
          input
        )
      ).toBe(false);
      expect(createParameterDefinition).not.toHaveBeenCalled();
    }
  );

  it('ignores an experiment that belongs to a different project', async () => {
    vi.mocked(getExperimentInProject).mockResolvedValue(undefined);

    expect(
      await createParameterDefinitionAction('another-project', 'experiment-1', {
        name: 'Temperature',
        unit: '',
        kind: 'number',
        role: 'parameter',
        defaultValue: ''
      })
    ).toBe(false);
    expect(createParameterDefinition).not.toHaveBeenCalled();
  });
});

describe('updateParameterDefinitionAction', () => {
  const rename = {
    name: 'Plasma power',
    unit: 'W',
    kind: 'number',
    role: 'parameter',
    defaultValue: ''
  };
  const renameStored = { ...rename, defaultValue: null };

  it('saves a change and refreshes the page', async () => {
    withStoredParameters();
    vi.mocked(isParameterInUse).mockResolvedValue(false);

    expect(
      await updateParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'power',
        rename
      )
    ).toBe(true);
    expect(updateParameterDefinition).toHaveBeenCalledWith(
      'experiment-1',
      'power',
      renameStored
    );
    expect(revalidatePath).toHaveBeenCalledWith(PAGE);
  });

  it('lets a parameter keep its own name but not take another one', async () => {
    withStoredParameters();
    vi.mocked(isParameterInUse).mockResolvedValue(false);

    expect(
      await updateParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'power',
        {
          ...rename,
          name: 'Power'
        }
      )
    ).toBe(true);
    expect(
      await updateParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'power',
        {
          ...rename,
          name: 'Pulse'
        }
      )
    ).toBe(false);
  });

  it('refuses to change the kind once a sample holds a value for it', async () => {
    withStoredParameters();
    vi.mocked(isParameterInUse).mockResolvedValue(true);

    expect(
      await updateParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'power',
        {
          ...rename,
          kind: 'text',
          role: 'parameter'
        }
      )
    ).toBe(false);
    expect(updateParameterDefinition).not.toHaveBeenCalled();
  });

  it('still lets an in-use parameter be renamed', async () => {
    withStoredParameters();
    vi.mocked(isParameterInUse).mockResolvedValue(true);

    expect(
      await updateParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'power',
        rename
      )
    ).toBe(true);
  });

  it('ignores a parameter the experiment does not have', async () => {
    withStoredParameters();

    expect(
      await updateParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'missing',
        rename
      )
    ).toBe(false);
    expect(updateParameterDefinition).not.toHaveBeenCalled();
  });
});

describe('deleteParameterDefinitionAction', () => {
  it('removes an unused parameter and refreshes the page', async () => {
    withStoredParameters();
    vi.mocked(isParameterInUse).mockResolvedValue(false);
    vi.mocked(deleteParameterDefinition).mockResolvedValueOnce(true);

    expect(
      await deleteParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'power'
      )
    ).toBe(true);
    expect(deleteParameterDefinition).toHaveBeenCalledWith(
      'experiment-1',
      'power'
    );
    expect(revalidatePath).toHaveBeenCalledWith(PAGE);
  });

  it('keeps a parameter that a sample holds a value for', async () => {
    withStoredParameters();
    vi.mocked(isParameterInUse).mockResolvedValue(true);

    expect(
      await deleteParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'power'
      )
    ).toBe(false);
    expect(deleteParameterDefinition).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('refreshes nothing when there was no such parameter', async () => {
    withStoredParameters();
    vi.mocked(isParameterInUse).mockResolvedValue(false);
    vi.mocked(deleteParameterDefinition).mockResolvedValueOnce(false);

    expect(
      await deleteParameterDefinitionAction(
        'project-1',
        'experiment-1',
        'missing'
      )
    ).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('result columns through the actions', () => {
  it('adds a result column with its role', async () => {
    withStoredParameters();

    await createParameterDefinitionAction('project-1', 'experiment-1', {
      name: 'Thickness',
      unit: 'nm',
      kind: 'number',
      role: 'result',
      defaultValue: ''
    });

    expect(createParameterDefinition).toHaveBeenCalledWith(
      'experiment-1',
      expect.objectContaining({ role: 'result', defaultValue: null })
    );
  });

  it('ignores a result that was given a default, whatever the browser checked', async () => {
    withStoredParameters();

    expect(
      await createParameterDefinitionAction('project-1', 'experiment-1', {
        name: 'Thickness',
        unit: 'nm',
        kind: 'number',
        role: 'result',
        defaultValue: '40'
      })
    ).toBe(false);
    expect(createParameterDefinition).not.toHaveBeenCalled();
  });
});

describe('default values through the actions', () => {
  const withDefault = (kind: string, defaultValue: string) => ({
    name: 'Temperature',
    unit: '°C',
    kind,
    role: 'parameter',
    defaultValue
  });

  it('stores a typed default as a number, accepting a decimal comma', async () => {
    withStoredParameters();

    await createParameterDefinitionAction(
      'project-1',
      'experiment-1',
      withDefault('number', '1,5')
    );

    expect(createParameterDefinition).toHaveBeenCalledWith(
      'experiment-1',
      expect.objectContaining({ defaultValue: 1.5 })
    );
  });

  it('rejects text as the default of a number parameter, instead of storing zero', async () => {
    withStoredParameters();

    const wasAdded = await createParameterDefinitionAction(
      'project-1',
      'experiment-1',
      withDefault('number', 'warm')
    );

    expect(wasAdded).toBe(false);
    expect(createParameterDefinition).not.toHaveBeenCalled();
  });

  it('lets the default change while the kind stays locked by existing samples', async () => {
    withStoredParameters();
    vi.mocked(isParameterInUse).mockResolvedValue(true);

    const wasSaved = await updateParameterDefinitionAction(
      'project-1',
      'experiment-1',
      'power',
      {
        name: 'Power',
        unit: 'W',
        kind: 'number',
        role: 'parameter',
        defaultValue: '120'
      }
    );

    expect(wasSaved).toBe(true);
    expect(updateParameterDefinition).toHaveBeenCalledWith(
      'experiment-1',
      'power',
      expect.objectContaining({ defaultValue: 120 })
    );
  });

  it('clears a default when the field is emptied', async () => {
    withStoredParameters();
    vi.mocked(isParameterInUse).mockResolvedValue(false);

    await updateParameterDefinitionAction(
      'project-1',
      'experiment-1',
      'power',
      {
        name: 'Power',
        unit: 'W',
        kind: 'number',
        role: 'parameter',
        defaultValue: ''
      }
    );

    expect(updateParameterDefinition).toHaveBeenCalledWith(
      'experiment-1',
      'power',
      expect.objectContaining({ defaultValue: null })
    );
  });
});
