import type { Sample } from '../types';

// TODO: demo data, replace with Drizzle in Step 6.
//
// EXAMPLE VALUES ONLY, NOT REAL MEASUREMENTS: every number and text below is
// a placeholder to show the layout. Only the four plasma pulse durations (5,
// 10, 15, 20 s) come from the owner's own spec example. Cycles is left empty
// on the first two samples to show a column that was added later.
export const DEMO_SAMPLES: Sample[] = [
  {
    id: 'demo-sample-1',
    experimentId: 'demo-experiment-1',
    code: 'ALD001',
    performedOn: '2026-09-04',
    values: {
      'demo-parameter-1': 100,
      'demo-parameter-2': 5,
      'demo-parameter-3': 10,
      'demo-parameter-4': 200,
      'demo-parameter-10': 80,
      'demo-parameter-11': 0.5,
      'demo-parameter-12': 2,
      'demo-parameter-13': 30,
      'demo-parameter-14': 'Example: silicon wafer, native oxide'
    },
    note: null,
    implementation:
      'Example, long text to test the table: plasma pulse study, first sample. Goal is to see how the film thickness changes with plasma pulse duration while every other setting stays the same. The reactor was pumped down overnight, the substrate was loaded after a short nitrogen purge, and the line was conditioned with ten dummy cycles before starting. This sentence only exists to make the cell wrap over several lines.',
    observation:
      'Example, long text to test the table: the film looked uniform across most of the wafer, with a faint colour change near one edge that may come from the holder. No visible particles. To be checked with ellipsometry and XPS before comparing with the next sample in the experiment. This sentence only exists to make the cell wrap over several lines.',
    derivedFromId: null,
    studyIds: ['demo-study-1'],
    createdAt: new Date('2026-09-04T10:00:00Z')
  },
  {
    id: 'demo-sample-2',
    experimentId: 'demo-experiment-1',
    code: 'ALD002',
    performedOn: '2026-09-05',
    values: {
      'demo-parameter-1': 100,
      'demo-parameter-2': 10,
      'demo-parameter-3': 10,
      'demo-parameter-4': 200,
      'demo-parameter-10': 80,
      'demo-parameter-11': 0.5,
      'demo-parameter-12': 2,
      'demo-parameter-13': 30,
      'demo-parameter-14': 'Example: silicon wafer, native oxide'
    },
    note: null,
    implementation: 'Example: second sample of the plasma pulse study.',
    observation: null,
    derivedFromId: null,
    studyIds: ['demo-study-1'],
    createdAt: new Date('2026-09-05T10:00:00Z')
  },
  {
    id: 'demo-sample-3',
    experimentId: 'demo-experiment-1',
    code: 'ALD003',
    performedOn: '2026-09-08',
    values: {
      'demo-parameter-1': 100,
      'demo-parameter-2': 15,
      'demo-parameter-3': 10,
      'demo-parameter-4': 200,
      'demo-parameter-5': 50,
      'demo-parameter-10': 100,
      'demo-parameter-11': 0.6,
      'demo-parameter-12': 2,
      'demo-parameter-13': 45,
      'demo-parameter-14': 'Example: silicon wafer, native oxide'
    },
    note: 'Example note: pulse changed after reactor service.',
    implementation:
      'Example, long text to test the table: plasma pulse study, third sample, longer pulse. Goal is to see how the film thickness changes with plasma pulse duration while every other setting stays the same. The reactor was pumped down overnight, the substrate was loaded after a short nitrogen purge, and the line was conditioned with ten dummy cycles before starting. This sentence only exists to make the cell wrap over several lines.',
    observation:
      'Example, long text to test the table: the film looked uniform across most of the wafer, with a faint colour change near one edge that may come from the holder. No visible particles. To be checked with ellipsometry and XPS before comparing with the next sample in the experiment. This sentence only exists to make the cell wrap over several lines.',
    derivedFromId: null,
    studyIds: ['demo-study-1'],
    createdAt: new Date('2026-09-08T10:00:00Z')
  },
  {
    id: 'demo-sample-4',
    experimentId: 'demo-experiment-1',
    code: 'ALD004',
    performedOn: '2026-09-09',
    values: {
      'demo-parameter-1': 100,
      'demo-parameter-2': 20,
      'demo-parameter-3': 10,
      'demo-parameter-4': 200,
      'demo-parameter-5': 50,
      'demo-parameter-10': 100,
      'demo-parameter-11': 0.6,
      'demo-parameter-12': 3,
      'demo-parameter-13': 45,
      'demo-parameter-14': 'Example: glass slide'
    },
    note: null,
    implementation: 'Example: last sample of the plasma pulse study.',
    observation: null,
    derivedFromId: null,
    studyIds: ['demo-study-1', 'demo-study-2'],
    createdAt: new Date('2026-09-09T10:00:00Z')
  },
  {
    id: 'demo-sample-5',
    experimentId: 'demo-experiment-1',
    code: 'ALD005',
    performedOn: '2026-09-10',
    values: {
      'demo-parameter-1': 100,
      'demo-parameter-2': 10,
      'demo-parameter-3': 10,
      'demo-parameter-4': 200,
      'demo-parameter-5': 50,
      'demo-parameter-10': 100,
      'demo-parameter-11': 0.6,
      'demo-parameter-12': 3,
      'demo-parameter-13': 45,
      'demo-parameter-14': 'Example: glass slide'
    },
    note: null,
    implementation: 'Example: reuses earlier settings for the TEB study.',
    observation: null,
    derivedFromId: null,
    studyIds: ['demo-study-2'],
    createdAt: new Date('2026-09-10T10:00:00Z')
  },
  {
    id: 'demo-sample-6',
    experimentId: 'demo-experiment-1',
    code: 'ALD006',
    performedOn: '2026-09-14',
    values: {
      'demo-parameter-1': 100,
      'demo-parameter-2': 10,
      'demo-parameter-3': 10,
      'demo-parameter-4': 200,
      'demo-parameter-5': 50,
      'demo-parameter-10': 80,
      'demo-parameter-11': 0.5,
      'demo-parameter-12': 2,
      'demo-parameter-13': 30,
      'demo-parameter-14': 'Example: silicon wafer, native oxide'
    },
    note: null,
    implementation:
      'Example, long text to test the table: reference run after a break. Goal is to see how the film thickness changes with plasma pulse duration while every other setting stays the same. The reactor was pumped down overnight, the substrate was loaded after a short nitrogen purge, and the line was conditioned with ten dummy cycles before starting. This sentence only exists to make the cell wrap over several lines.',
    observation:
      'Example, long text to test the table: the film looked uniform across most of the wafer, with a faint colour change near one edge that may come from the holder. No visible particles. To be checked with ellipsometry and XPS before comparing with the next sample in the experiment. This sentence only exists to make the cell wrap over several lines.',
    derivedFromId: null,
    studyIds: ['demo-study-3'],
    createdAt: new Date('2026-09-14T10:00:00Z')
  },
  {
    id: 'demo-sample-7',
    experimentId: 'demo-experiment-1',
    code: 'ALD003_Annealing',
    performedOn: '2026-09-12',
    values: {},
    note: null,
    implementation:
      'Example: annealing of ALD003. The treatment is described here.',
    observation: null,
    derivedFromId: 'demo-sample-3',
    studyIds: [],
    createdAt: new Date('2026-09-12T10:00:00Z')
  },
  {
    id: 'demo-sample-8',
    experimentId: 'demo-experiment-2',
    code: 'PSL001',
    performedOn: '2026-09-06',
    values: { 'demo-parameter-6': 1, 'demo-parameter-7': 20 },
    note: null,
    implementation: 'Example: first Paschen law measurement.',
    observation: null,
    derivedFromId: null,
    studyIds: [],
    createdAt: new Date('2026-09-06T10:00:00Z')
  },
  {
    id: 'demo-sample-9',
    experimentId: 'demo-experiment-2',
    code: 'PSL002',
    performedOn: '2026-09-06',
    values: { 'demo-parameter-6': 2, 'demo-parameter-7': 20 },
    note: null,
    implementation: 'Example: second Paschen law measurement.',
    observation: null,
    derivedFromId: null,
    studyIds: [],
    createdAt: new Date('2026-09-06T11:00:00Z')
  },
  {
    id: 'demo-sample-10',
    experimentId: 'demo-experiment-3',
    code: 'TEMP001',
    performedOn: '2026-09-13',
    values: { 'demo-parameter-8': 10, 'demo-parameter-9': 100 },
    note: null,
    implementation: 'Example: first temperature calibration.',
    observation: null,
    derivedFromId: null,
    studyIds: [],
    createdAt: new Date('2026-09-13T10:00:00Z')
  }
];
