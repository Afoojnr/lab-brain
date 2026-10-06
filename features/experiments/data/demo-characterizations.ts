import type { Characterization } from '../types';

// TODO: demo data, replace with Drizzle in Step 6. Technique names are the
// owner's own examples; the app itself never assumes a technique.
//
// EXAMPLE RECORDS ONLY, NOT REAL MEASUREMENTS: the dates and notes are
// placeholders. ALD003 has EDX twice, to show a technique recorded again.
export const DEMO_CHARACTERIZATIONS: Characterization[] = [
  {
    id: 'demo-characterization-1',
    sampleId: 'demo-sample-1',
    technique: 'SEM',
    measuredOn: '2026-09-15',
    note: 'Example: top view.',
    createdAt: new Date('2026-09-15T10:00:00Z')
  },
  {
    id: 'demo-characterization-2',
    sampleId: 'demo-sample-1',
    technique: 'Ellipsometry',
    measuredOn: '2026-09-16',
    note: null,
    createdAt: new Date('2026-09-16T10:00:00Z')
  },
  {
    id: 'demo-characterization-3',
    sampleId: 'demo-sample-2',
    technique: 'SEM',
    measuredOn: '2026-09-15',
    note: null,
    createdAt: new Date('2026-09-15T11:00:00Z')
  },
  {
    id: 'demo-characterization-4',
    sampleId: 'demo-sample-3',
    technique: 'EDX',
    measuredOn: '2026-09-18',
    note: 'Example: first measurement.',
    createdAt: new Date('2026-09-18T10:00:00Z')
  },
  {
    id: 'demo-characterization-5',
    sampleId: 'demo-sample-3',
    technique: 'EDX',
    measuredOn: '2026-09-25',
    note: 'Example: repeated after repositioning the sample.',
    createdAt: new Date('2026-09-25T10:00:00Z')
  }
];
