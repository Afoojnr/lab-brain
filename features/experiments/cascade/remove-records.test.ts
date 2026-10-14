// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleted = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/storage', () => ({
  getStorage: () => ({
    delete: async (path: string) => {
      deleted.push(path);
      return true;
    }
  })
}));

import {
  createCharacterization,
  listCharacterizationsBySample
} from '../data/characterizations';
import {
  createDerivedColumn,
  listDerivedColumns
} from '../data/derived-columns';
import {
  createDataset,
  listDatasetsByCharacterization
} from '../data/datasets';
import { getExperimentById, createExperiment } from '../data/experiments';
import {
  createParameterDefinition,
  listParameterDefinitions
} from '../data/parameter-definitions';
import { createProject, getProjectById } from '../data/projects';
import {
  createSample,
  getSampleById,
  listSamplesByExperiment
} from '../data/samples';
import { createStudy, listStudiesByExperiment } from '../data/studies';
import { countExperiment, countProject, countSample } from './count-records';
import {
  removeExperiment,
  removeProject,
  removeSample,
  removeStudy
} from './remove-records';

/** One project with an experiment of two samples, a study, columns, a measurement and two files; and a second project that must never be touched. */
const build = async (name: string) => {
  const project = await createProject({ name, description: '' });
  const experiment = await createExperiment(project.id, {
    name: 'Deposition',
    codePrefix: 'ABC',
    protocol: ''
  });
  const study = await createStudy(experiment.id, {
    name: 'Study',
    description: ''
  });
  await createParameterDefinition(experiment.id, {
    name: 'Cycles',
    unit: '',
    kind: 'number',
    role: 'parameter',
    defaultValue: null
  });
  await createDerivedColumn(experiment.id, {
    name: 'Rate',
    unit: '',
    formula: '[#x]'
  });
  const sampleInput = (code: string, studyIds: string[]) => ({
    code,
    performedOn: null,
    values: {},
    studyIds,
    implementation: null,
    observation: null,
    note: null
  });
  const first = await createSample(
    experiment.id,
    sampleInput('ABC001', [study.id])
  );
  const second = await createSample(
    experiment.id,
    sampleInput('ABC002', [study.id])
  );
  const measurement = await createCharacterization(first.id, {
    technique: 'EDX',
    measuredOn: '',
    note: ''
  });
  const file = (n: string) => ({
    fileName: `${name}-${n}.csv`,
    folder: null,
    relativePath: null,
    storagePath: `files/${name}-${n}.csv`,
    contentType: 'text/csv',
    sizeBytes: 1
  });
  await createDataset(measurement.id, file('a'));
  await createDataset(measurement.id, file('b'));

  return { project, experiment, study, first, second, measurement };
};

beforeEach(() => {
  deleted.length = 0;
});

describe('removeStudy', () => {
  it('removes only the study: its samples stay with all their data and lose the tag', async () => {
    const { experiment, study, first, second } = await build('study');

    expect(await removeStudy(experiment.id, study.id)).toBe(2);

    expect(await listStudiesByExperiment(experiment.id)).toEqual([]);
    expect((await getSampleById(first.id))?.studyIds).toEqual([]);
    expect((await getSampleById(second.id))?.code).toBe('ABC002');
    expect(deleted).toEqual([]);
  });

  it('does nothing for a study that is not in the experiment', async () => {
    const one = await build('study-a');
    const other = await build('study-b');

    expect(await removeStudy(one.experiment.id, other.study.id)).toBeNull();
    expect(await listStudiesByExperiment(other.experiment.id)).toHaveLength(1);
  });
});

describe('removeSample', () => {
  it('removes the sample, its measurements and its files from storage and records, and nothing of another sample', async () => {
    const { experiment, first, second, measurement } = await build('sample');

    const removed = await removeSample(experiment.id, first.id);

    expect(removed).toMatchObject({
      characterizationIds: [measurement.id],
      sampleCount: 1,
      fileCount: 2
    });
    expect(await getSampleById(first.id)).toBeUndefined();
    expect(await listCharacterizationsBySample(first.id)).toEqual([]);
    expect(await listDatasetsByCharacterization(measurement.id)).toEqual([]);
    expect(deleted.sort()).toEqual([
      'files/sample-a.csv',
      'files/sample-b.csv'
    ]);
    expect(await getSampleById(second.id)).toBeDefined();
    expect(await listSamplesByExperiment(experiment.id)).toHaveLength(1);
  });

  it('refuses a sample that is not in the experiment, removing nothing', async () => {
    const one = await build('sample-x');
    const other = await build('sample-y');

    expect(await removeSample(one.experiment.id, other.first.id)).toBeNull();
    expect(await getSampleById(other.first.id)).toBeDefined();
    expect(deleted).toEqual([]);
  });
});

describe('removeExperiment', () => {
  it('removes every sample with its measurements and files, the columns and studies, and then the experiment; another project is untouched', async () => {
    const mine = await build('exp-mine');
    const other = await build('exp-other');

    const removed = await removeExperiment(mine.project.id, mine.experiment.id);

    expect(removed).toMatchObject({
      experimentIds: [mine.experiment.id],
      sampleCount: 2,
      fileCount: 2
    });
    expect(removed?.characterizationIds).toEqual([mine.measurement.id]);
    expect(await getExperimentById(mine.experiment.id)).toBeUndefined();
    expect(await listSamplesByExperiment(mine.experiment.id)).toEqual([]);
    expect(await listParameterDefinitions(mine.experiment.id)).toEqual([]);
    expect(await listDerivedColumns(mine.experiment.id)).toEqual([]);
    expect(await listStudiesByExperiment(mine.experiment.id)).toEqual([]);
    expect(deleted.sort()).toEqual([
      'files/exp-mine-a.csv',
      'files/exp-mine-b.csv'
    ]);

    expect(await getExperimentById(other.experiment.id)).toBeDefined();
    expect(await listSamplesByExperiment(other.experiment.id)).toHaveLength(2);
    expect(await listParameterDefinitions(other.experiment.id)).toHaveLength(1);
  });

  it('refuses an experiment of another project', async () => {
    const one = await build('exp-p1');
    const other = await build('exp-p2');

    expect(
      await removeExperiment(one.project.id, other.experiment.id)
    ).toBeNull();
    expect(await getExperimentById(other.experiment.id)).toBeDefined();
  });
});

describe('removeProject', () => {
  it('removes its experiments with everything in them and then the project, leaving other projects alone', async () => {
    const mine = await build('proj-mine');
    const second = await createExperiment(mine.project.id, {
      name: 'Second',
      codePrefix: 'XYZ',
      protocol: ''
    });
    const other = await build('proj-other');

    const removed = await removeProject(mine.project.id);

    expect(removed?.experimentIds.sort()).toEqual(
      [mine.experiment.id, second.id].sort()
    );
    expect(removed).toMatchObject({ sampleCount: 2, fileCount: 2 });
    expect(await getProjectById(mine.project.id)).toBeUndefined();
    expect(await getExperimentById(second.id)).toBeUndefined();
    expect(await getProjectById(other.project.id)).toBeDefined();
    expect(await listSamplesByExperiment(other.experiment.id)).toHaveLength(2);
    expect(await removeProject(mine.project.id)).toBeNull();
  });
});

describe('counts for the confirmations', () => {
  it('count exactly what a delete would take', async () => {
    const { project, experiment, first } = await build('counts');

    expect(await countSample(first.id)).toMatchObject({
      characterizations: 1,
      files: 2
    });
    expect(await countExperiment(experiment.id)).toEqual({
      experiments: 1,
      samples: 2,
      characterizations: 1,
      files: 2,
      columns: 2,
      studies: 1
    });
    expect(await countProject(project.id)).toMatchObject({
      experiments: 1,
      samples: 2,
      files: 2
    });
  });
});
