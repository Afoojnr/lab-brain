/** The sections of a project page, shown as tabs in this order. */
export const PROJECT_TABS = [
  'background',
  'experiments',
  'references'
] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number];

/** A project opens on its experiments unless the link names a tab. */
export const DEFAULT_PROJECT_TAB: ProjectTab = 'experiments';

/**
 * The tab named in the URL, or the default when it is missing or not one of the
 * three, so a wrong link still opens the project.
 */
export const parseProjectTab = (value: unknown): ProjectTab =>
  PROJECT_TABS.find(tab => tab === value) ?? DEFAULT_PROJECT_TAB;
