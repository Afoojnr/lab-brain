import type { Experiment } from '../types';

// TODO: demo data, replace with Drizzle in Step 6. The experiment and prefixes
// are the owner's own examples (one sheet per kind of sample). Only the first
// experiment has a protocol, and it is a labelled placeholder.
export const DEMO_EXPERIMENTS: Experiment[] = [
  {
    id: 'demo-experiment-1',
    projectId: 'demo-project-1',
    name: 'Deposition',
    codePrefix: 'ALD',
    protocol:
      'Example, not a real protocol: clean the substrate, pump down, run the cycles at the set temperature, then cool under flow. Each sample only differs where its columns say so.',
    createdAt: new Date('2026-09-02T11:00:00Z')
  },
  {
    id: 'demo-experiment-2',
    projectId: 'demo-project-1',
    name: 'Paschen law',
    codePrefix: 'PSL',
    protocol: null,
    createdAt: new Date('2026-09-02T12:00:00Z')
  },
  {
    id: 'demo-experiment-3',
    projectId: 'demo-project-2',
    name: 'Temperature calibration',
    codePrefix: 'TEMP',
    protocol: null,
    createdAt: new Date('2026-09-12T11:00:00Z')
  },
  {
    id: 'demo-experiment-4',
    projectId: 'demo-project-3',
    name: 'Deposition',
    codePrefix: 'PVD',
    protocol: null,
    createdAt: new Date('2026-09-20T11:00:00Z')
  }
];
