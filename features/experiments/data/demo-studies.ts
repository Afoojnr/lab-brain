import type { Study } from '../types';

// TODO: demo data, replace with Drizzle in Step 6. Studies are optional
// named studies inside one experiment; a sample can belong to several.
export const DEMO_STUDIES: Study[] = [
  {
    id: 'demo-study-1',
    experimentId: 'demo-experiment-1',
    name: 'Plasma pulse study',
    description: 'Example: how the plasma pulse duration changes the film.',
    createdAt: new Date('2026-09-03T10:00:00Z')
  },
  {
    id: 'demo-study-2',
    experimentId: 'demo-experiment-1',
    name: 'TEB study',
    description: 'Example: a second study that reuses an earlier sample.',
    createdAt: new Date('2026-09-05T10:00:00Z')
  },
  {
    id: 'demo-study-3',
    experimentId: 'demo-experiment-1',
    name: 'Reference',
    description: 'Example: runs that check the reactor after a break.',
    createdAt: new Date('2026-09-07T10:00:00Z')
  }
];
