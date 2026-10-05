import type { Project } from '../types';

// TODO: demo data, replace with Drizzle in Step 6. Names are the project
// owner's own examples; the app itself never assumes a technique. Descriptions
// are left empty where none was given, never invented.
export const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-project-3',
    name: 'PVD of gallium nitride',
    description: null,
    createdAt: new Date('2026-09-20T10:00:00Z')
  },
  {
    id: 'demo-project-2',
    name: 'CVD of borophene',
    description: null,
    createdAt: new Date('2026-09-12T10:00:00Z')
  },
  {
    id: 'demo-project-1',
    name: 'ALD of BxC',
    description: 'PE ALD, TEB + H2 plasma, Ar carrier',
    createdAt: new Date('2026-09-02T10:00:00Z')
  }
];
