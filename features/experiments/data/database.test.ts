import { describe, expect, it } from 'vitest';

import { runInTransaction } from '@/lib/db/client';

import { createCharacterization } from './characterizations';
import { createDataset, listDatasetsBySample } from './datasets';
import { createExperiment, listExperimentsByProject } from './experiments';
import { createParameterDefinition } from './parameter-definitions';
import { createProject, deleteProject, listProjects } from './projects';
import {
  assignSamplesToStudy,
  createSample,
  getSampleById,
  isParameterInUse,
  listSamplesByExperiment,
  removeStudyFromSamples,
  updateSample
} from './samples';
import { createStudy, deleteStudy } from './studies';

const PROJECT = { name: 'Database test', description: '' };
const EXPERIMENT = { name: 'Deposition', codePrefix: 'DBT', protocol: '' };
const STUDY = { name: 'First study', description: '' };
const sampleInput = (
  code: string,
  overrides: Partial<Parameters<typeof createSample>[1]> = {}
) => ({
  code,
  performedOn: null,
  values: {},
  studyIds: [],
  implementation: null,
  observation: null,
  note: null,
  ...overrides
});

describe('values in the database', () => {
  it('keeps a zero as zero and a missing value missing', async () => {
    const project = await createProject(PROJECT);
    const experiment = await createExperiment(project.id, EXPERIMENT);
    const sample = await createSample(
      experiment.id,
      sampleInput('DBT001', { values: { temperature: 0, gas: 'Ar' } })
    );

    const stored = await getSampleById(sample.id);

    expect(stored?.values).toEqual({ temperature: 0, gas: 'Ar' });
    expect('pressure' in (stored?.values ?? {})).toBe(false);
  });

  it('finds a column in use by the id of a value, and not one that is unused', async () => {
    const project = await createProject(PROJECT);
    const experiment = await createExperiment(project.id, EXPERIMENT);
    const used = await createParameterDefinition(experiment.id, {
      name: 'Temperature',
      unit: '°C',
      kind: 'number',
      role: 'parameter',
      defaultValue: null
    });
    const unused = await createParameterDefinition(experiment.id, {
      name: 'Pressure',
      unit: '',
      kind: 'number',
      role: 'parameter',
      defaultValue: null
    });
    await createSample(
      experiment.id,
      sampleInput('DBT001', { values: { [used.id]: 250 } })
    );

    expect(await isParameterInUse(used.id)).toBe(true);
    expect(await isParameterInUse(unused.id)).toBe(false);
  });
});

describe('studies of a sample', () => {
  it("keeps a sample's studies in the order they were set, and drops ones from another experiment", async () => {
    const project = await createProject(PROJECT);
    const experiment = await createExperiment(project.id, EXPERIMENT);
    const other = await createExperiment(project.id, EXPERIMENT);
    const first = await createStudy(experiment.id, STUDY);
    const second = await createStudy(experiment.id, STUDY);
    const foreign = await createStudy(other.id, STUDY);

    const sample = await createSample(
      experiment.id,
      sampleInput('DBT001', {
        studyIds: [second.id, foreign.id, first.id, second.id]
      })
    );

    expect(sample.studyIds).toEqual([second.id, first.id]);
  });

  it('tags a sample once, counting only the ones newly tagged', async () => {
    const project = await createProject(PROJECT);
    const experiment = await createExperiment(project.id, EXPERIMENT);
    const study = await createStudy(experiment.id, STUDY);
    const a = await createSample(experiment.id, sampleInput('DBT001'));
    const b = await createSample(experiment.id, sampleInput('DBT002'));

    expect(await assignSamplesToStudy(experiment.id, study.id, [a.id])).toBe(1);
    expect(
      await assignSamplesToStudy(experiment.id, study.id, [a.id, b.id])
    ).toBe(1);
    expect((await getSampleById(a.id))?.studyIds).toEqual([study.id]);
  });

  it('replaces them when a sample is saved, and keeps its other fields', async () => {
    const project = await createProject(PROJECT);
    const experiment = await createExperiment(project.id, EXPERIMENT);
    const study = await createStudy(experiment.id, STUDY);
    const sample = await createSample(
      experiment.id,
      sampleInput('DBT001', { studyIds: [study.id], note: 'kept' })
    );

    const updated = await updateSample(
      experiment.id,
      sample.id,
      sampleInput('DBT001', { note: 'kept' })
    );

    expect(updated?.studyIds).toEqual([]);
    expect(updated?.note).toBe('kept');
  });

  it('is taken off the samples when the study is removed, and the samples stay', async () => {
    const project = await createProject(PROJECT);
    const experiment = await createExperiment(project.id, EXPERIMENT);
    const study = await createStudy(experiment.id, STUDY);
    const sample = await createSample(
      experiment.id,
      sampleInput('DBT001', { studyIds: [study.id] })
    );

    expect(await removeStudyFromSamples(experiment.id, study.id)).toBe(1);
    expect(await deleteStudy(experiment.id, study.id)).toBe(true);

    expect((await getSampleById(sample.id))?.studyIds).toEqual([]);
    expect(await listSamplesByExperiment(experiment.id)).toHaveLength(1);
  });
});

describe('removing a project', () => {
  it('takes everything inside it along and leaves other projects alone', async () => {
    const before = (await listProjects()).length;
    const project = await createProject(PROJECT);
    const experiment = await createExperiment(project.id, EXPERIMENT);
    const study = await createStudy(experiment.id, STUDY);
    const sample = await createSample(
      experiment.id,
      sampleInput('DBT001', { studyIds: [study.id] })
    );
    const measurement = await createCharacterization(sample.id, {
      technique: 'SEM',
      measuredOn: '',
      note: ''
    });
    await createDataset(measurement.id, {
      fileName: 'one.txt',
      folder: null,
      relativePath: null,
      storagePath: 'x/one.txt',
      contentType: 'text/plain',
      sizeBytes: 1
    });

    expect(await deleteProject(project.id)).toBe(true);

    expect(await listExperimentsByProject(project.id)).toEqual([]);
    expect(await getSampleById(sample.id)).toBeUndefined();
    expect(await listDatasetsBySample(sample.id)).toEqual([]);
    expect(await listProjects()).toHaveLength(before);
  });
});

describe('writing several records as one', () => {
  it('keeps all of them when the work succeeds', async () => {
    const project = await runInTransaction(async () => {
      const created = await createProject(PROJECT);
      await createExperiment(created.id, EXPERIMENT);

      return created;
    });

    expect(await listExperimentsByProject(project.id)).toHaveLength(1);
  });

  it('keeps none of them when a later write fails', async () => {
    const before = (await listProjects()).length;
    let projectId = '';

    await expect(
      runInTransaction(async () => {
        const created = await createProject(PROJECT);
        projectId = created.id;
        await createExperiment(created.id, EXPERIMENT);
        throw new Error('the third write failed');
      })
    ).rejects.toThrow('the third write failed');

    expect(await listProjects()).toHaveLength(before);
    expect(await listExperimentsByProject(projectId)).toEqual([]);
  });

  it('lets a nested transaction join the outer one', async () => {
    const before = (await listProjects()).length;

    await expect(
      runInTransaction(async () => {
        await runInTransaction(() => createProject(PROJECT));
        throw new Error('outer failed');
      })
    ).rejects.toThrow('outer failed');

    expect(await listProjects()).toHaveLength(before);
  });
});
