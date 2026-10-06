import { describe, expect, it } from 'vitest';

import {
  createParameterDefinition,
  listParameterDefinitions
} from './parameter-definitions';

// Runs against the in-memory demo data. TODO: Step 6 turns this into a test
// against a real SQLite database, keeping the same expectations.
describe('column order', () => {
  it('lists parameters first and results last, whatever order they were added in', async () => {
    await createParameterDefinition('demo-experiment-2', {
      name: 'Gap',
      unit: 'mm',
      kind: 'number',
      role: 'result',
      defaultValue: null
    });
    await createParameterDefinition('demo-experiment-2', {
      name: 'Voltage',
      unit: 'V',
      kind: 'number',
      role: 'parameter',
      defaultValue: null
    });

    const columns = await listParameterDefinitions('demo-experiment-2');

    expect(columns.map(column => [column.name, column.role])).toEqual([
      ['Pressure', 'parameter'],
      ['Flow rate', 'parameter'],
      ['Voltage', 'parameter'],
      ['Gap', 'result']
    ]);
  });

  it('gives the ALD demo its two result columns after the parameters', async () => {
    const roles = (await listParameterDefinitions('demo-experiment-1')).map(
      column => column.role
    );

    expect(roles.slice(-2)).toEqual(['result', 'result']);
    expect(roles.slice(0, -2).every(role => role === 'parameter')).toBe(true);
  });
});
