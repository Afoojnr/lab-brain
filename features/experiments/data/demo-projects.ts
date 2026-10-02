import type { Project } from '../types';

// TODO: demo data, replace with Drizzle in Step 4. Neutral names on purpose:
// real projects are named by the user.
export const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-project-3',
    name: 'Project 3',
    codePrefix: 'PRJ',
    protocol: null,
    createdAt: new Date('2026-09-20T10:00:00Z')
  },
  {
    id: 'demo-project-2',
    name: 'Project 2',
    codePrefix: 'TST',
    protocol: 'Default method for this project, shown as an example.',
    createdAt: new Date('2026-09-12T10:00:00Z')
  },
  {
    id: 'demo-project-1',
    name: 'Project 1',
    codePrefix: 'EXP',
    protocol: 'Default method for this project, shown as an example.',
    createdAt: new Date('2026-09-02T10:00:00Z')
  }
];
