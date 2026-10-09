import type { NavigationData } from '@/types/navigation';

import { listProjects } from './projects';

/** Everything the sidebar lists: the projects, newest first. */
export const listNavigation = async (): Promise<NavigationData> => ({
  projects: (await listProjects()).map(({ id, name }) => ({ id, name }))
});
