import { describe, expect, it } from 'vitest';

import {
  createCharacterization,
  deleteCharacterization,
  getCharacterizationOfSample,
  listCharacterizationsByExperiment,
  listCharacterizationsBySample,
  listTechniquesByProject,
  updateCharacterization
} from './characterizations';

// Runs against the in-memory demo data. TODO: Step 6 turns this into a test
// against a real SQLite database, keeping the same expectations.
describe('listing characterizations', () => {
  it("lists a sample's, oldest date first, and the same technique can appear twice", async () => {
    const items = await listCharacterizationsBySample('demo-sample-3');

    expect(items.map(item => [item.technique, item.measuredOn])).toEqual([
      ['EDX', '2026-09-18'],
      ['EDX', '2026-09-25']
    ]);
  });

  it("lists an experiment's across all its samples, and none from other experiments", async () => {
    const items = await listCharacterizationsByExperiment('demo-experiment-1');

    expect(new Set(items.map(item => item.sampleId))).toEqual(
      new Set(['demo-sample-1', 'demo-sample-2', 'demo-sample-3'])
    );
    expect(
      await listCharacterizationsByExperiment('demo-experiment-3')
    ).toEqual([]);
  });

  it('lists the techniques used in a project, each once, in the order first measured', async () => {
    expect(await listTechniquesByProject('demo-project-1')).toEqual([
      'SEM',
      'Ellipsometry',
      'EDX'
    ]);
    expect(await listTechniquesByProject('demo-project-2')).toEqual([]);
  });
});

describe('changing characterizations', () => {
  it('stores a new one with an empty date and note as null, and sorts it after dated ones', async () => {
    const created = await createCharacterization('demo-sample-2', {
      technique: 'FTIR',
      measuredOn: '',
      note: ''
    });

    expect(created).toMatchObject({ measuredOn: null, note: null });
    const items = await listCharacterizationsBySample('demo-sample-2');
    expect(items.at(-1)?.technique).toBe('FTIR');
  });

  it('updates a record, but only through the sample that owns it', async () => {
    const [first] = await listCharacterizationsBySample('demo-sample-1');
    if (!first) throw new Error('demo data changed');

    expect(
      await updateCharacterization('demo-sample-2', first.id, {
        technique: 'XPS',
        measuredOn: '',
        note: ''
      })
    ).toBeUndefined();
    const updated = await updateCharacterization('demo-sample-1', first.id, {
      technique: first.technique,
      measuredOn: first.measuredOn ?? '',
      note: 'Changed note'
    });

    expect(updated?.note).toBe('Changed note');
  });

  it('deletes a record, but only through the sample that owns it', async () => {
    const created = await createCharacterization('demo-sample-1', {
      technique: 'AFM',
      measuredOn: '2026-10-01',
      note: ''
    });

    expect(await deleteCharacterization('demo-sample-2', created.id)).toBe(
      false
    );
    expect(await getCharacterizationOfSample('demo-sample-1', created.id)).toBe(
      created
    );
    expect(await deleteCharacterization('demo-sample-1', created.id)).toBe(
      true
    );
    expect(
      await getCharacterizationOfSample('demo-sample-1', created.id)
    ).toBeUndefined();
  });
});
