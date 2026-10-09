/** What the sidebar needs to navigate: every project, newest first. */
export type NavigationProject = { id: string; name: string };

export type NavigationData = { projects: NavigationProject[] };
