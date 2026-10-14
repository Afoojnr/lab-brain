import type { Project } from './types';

// Demo data, seeded into the database. Names are the project
// owner's own examples; the app itself never assumes a technique. Descriptions
// are left empty where none was given, never invented.
export const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-project-3',
    name: 'PVD of gallium nitride',
    description: null,
    background: null,
    createdAt: new Date('2026-09-20T10:00:00Z')
  },
  {
    id: 'demo-project-2',
    name: 'CVD of borophene',
    description: null,
    background: null,
    createdAt: new Date('2026-09-12T10:00:00Z')
  },
  {
    id: 'demo-project-1',
    name: 'ALD of BxC',
    description: 'PE ALD, TEB + H2 plasma, Ar carrier',
    background: null,
    createdAt: new Date('2026-09-02T10:00:00Z')
  }
];
