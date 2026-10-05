import { describe, expect, it } from 'vitest';

import {
  assignSamplesToStudy,
  createSample,
  getSampleById,
  isParameterInUse,
  listSampleCodesByProject,
  listSamplesByExperiment,
  updateSample
} from './samples';
import { suggestNextSampleCode } from '../parameters';
import {
  getExperimentInProject,
  listExperimentsByProject,
  updateExperiment
} from './experiments';

// Runs against the in-memory demo data. TODO: Step 6 turns this into a test
// against a real SQLite database, keeping the same expectations.
describe('sample codes across a project', () => {
  it('lists every code in the project, across all its experiment, but not other projects', async () => {
    const codes = await listSampleCodesByProject('demo-project-1');

    expect(codes).toEqual(
      expect.arrayContaining(['ALD001', 'ALD003_Annealing', 'PSL001'])
    );
    expect(codes).not.toContain('TEMP001');
  });

  it('includes a newly created sample', async () => {
    await createSample('demo-experiment-2', {
      code: 'PSL099',
      performedOn: null,
      values: {},
      studyIds: [],
      implementation: null,
      observation: null,
      note: null
    });

    expect(await listSampleCodesByProject('demo-project-1')).toContain(
      'PSL099'
    );
    expect(
      (await listSamplesByExperiment('demo-experiment-2')).map(
        sample => sample.code
      )
    ).toContain('PSL099');
  });
});

describe('parameter usage', () => {
  it('knows a column that samples hold values for is in use', async () => {
    expect(await isParameterInUse('demo-parameter-1')).toBe(true);
  });

  it('knows a column no sample uses is free', async () => {
    expect(await isParameterInUse('a-column-nobody-filled')).toBe(false);
  });
});

describe('updating a sample', () => {
  it('changes what the form edits, including studies and the note, and keeps lineage', async () => {
    const before = await getSampleById('demo-sample-3');
    expect(before?.note).not.toBeNull();

    const updated = await updateSample('demo-experiment-1', 'demo-sample-3', {
      code: 'ALD003',
      performedOn: null,
      values: { 'demo-parameter-1': 120 },
      studyIds: ['demo-study-1', 'demo-study-3'],
      implementation: 'Changed',
      observation: null,
      note: 'Raised after the check'
    });

    expect(updated).toMatchObject({
      values: { 'demo-parameter-1': 120 },
      implementation: 'Changed',
      performedOn: null
    });
    expect(updated?.note).toBe('Raised after the check');
    expect(updated?.studyIds).toEqual(['demo-study-1', 'demo-study-3']);
  });

  it('does not touch a sample through a different experiment', async () => {
    expect(
      await updateSample('demo-experiment-2', 'demo-sample-3', {
        code: 'X',
        performedOn: null,
        values: {},
        studyIds: [],
        implementation: null,
        observation: null,
        note: null
      })
    ).toBeUndefined();
  });
});

describe('experiment access', () => {
  it('only reaches an experiment through the project that owns it', async () => {
    expect(
      await getExperimentInProject('demo-project-1', 'demo-experiment-1')
    ).toBeDefined();
    expect(
      await getExperimentInProject('demo-project-2', 'demo-experiment-1')
    ).toBeUndefined();
  });

  it("lists a project's experiment in the order they were added, like sheets", async () => {
    const names = (await listExperimentsByProject('demo-project-1')).map(
      experiment => experiment.name
    );

    expect(names.slice(0, 2)).toEqual(['Deposition', 'Paschen law']);
  });
});

describe('assigning samples to a study', () => {
  it('tags the chosen samples once, keeps their other tags and skips ids from other experiment', async () => {
    const tagged = await assignSamplesToStudy(
      'demo-experiment-1',
      'demo-study-3',
      ['demo-sample-2', 'demo-sample-4', 'demo-sample-8']
    );
    const again = await assignSamplesToStudy(
      'demo-experiment-1',
      'demo-study-3',
      ['demo-sample-2']
    );

    expect(tagged).toBe(2);
    expect(again).toBe(0);
    expect((await getSampleById('demo-sample-2'))?.studyIds).toEqual([
      'demo-study-1',
      'demo-study-3'
    ]);
    expect((await getSampleById('demo-sample-4'))?.studyIds).toEqual([
      'demo-study-1',
      'demo-study-2',
      'demo-study-3'
    ]);
    expect((await getSampleById('demo-sample-8'))?.studyIds).toEqual([]);
  });
});

describe('changing an experiment prefix', () => {
  it('leaves the codes of existing samples as they are and only applies to new ones', async () => {
    const before = await listSamplesByExperiment('demo-experiment-3');
    expect(before.map(sample => sample.code)).toEqual(['TEMP001']);

    await updateExperiment('demo-experiment-3', {
      name: 'Temperature calibration',
      codePrefix: 'CAL',
      protocol: ''
    });

    const after = await listSamplesByExperiment('demo-experiment-3');
    expect(after.map(sample => sample.code)).toEqual(['TEMP001']);
    expect(await listSampleCodesByProject('demo-project-2')).toEqual([
      'TEMP001'
    ]);
    expect(
      suggestNextSampleCode(
        'CAL',
        await listSampleCodesByProject('demo-project-2')
      )
    ).toBe('CAL001');
  });
});
