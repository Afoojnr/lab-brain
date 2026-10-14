export type TourId = 'home' | 'project' | 'experiment' | 'sample';

export type TourStep = {
  /** Names the step's text in the `tour.steps.<tour>.<id>` messages. */
  id: string;
  /** CSS selector of the element to spotlight. */
  selector: string;
  /** Where the explanation sits next to the element. */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Only on a wide screen (the sidebar is a hidden sheet on a phone). */
  device?: 'desktop' | 'mobile';
};

const tour = (name: string) => `[data-tour="${name}"]`;

/** The steps of each tour, in order. A step whose element is not on the page is left out. */
export const TOURS: Record<TourId, TourStep[]> = {
  home: [
    { id: 'menu', selector: tour('menu-toggle'), device: 'mobile' },
    {
      id: 'projects',
      selector: tour('sidebar-projects'),
      side: 'right',
      device: 'desktop'
    },
    { id: 'newProject', selector: tour('new-project'), side: 'bottom' },
    {
      id: 'techniques',
      selector: tour('sidebar-techniques'),
      side: 'right',
      device: 'desktop'
    },
    {
      id: 'plots',
      selector: tour('sidebar-plots'),
      side: 'right',
      device: 'desktop'
    },
    {
      id: 'settings',
      selector: tour('sidebar-settings'),
      side: 'right',
      device: 'desktop'
    },
    { id: 'help', selector: tour('help-button'), side: 'bottom' }
  ],
  project: [
    { id: 'tabs', selector: tour('project-tabs'), side: 'bottom' },
    { id: 'newExperiment', selector: tour('new-experiment'), side: 'bottom' },
    { id: 'import', selector: tour('import'), side: 'bottom' },
    { id: 'more', selector: tour('more-actions'), side: 'bottom' },
    { id: 'askAi', selector: tour('ask-ai'), side: 'left' }
  ],
  experiment: [
    { id: 'experiments', selector: tour('experiment-tabs'), side: 'bottom' },
    { id: 'sections', selector: tour('section-tabs'), side: 'bottom' },
    { id: 'addSample', selector: tour('add-sample'), side: 'bottom' },
    { id: 'import', selector: tour('import'), side: 'bottom' },
    { id: 'report', selector: tour('report'), side: 'bottom' },
    { id: 'export', selector: tour('export-samples'), side: 'bottom' },
    { id: 'more', selector: tour('more-actions'), side: 'bottom' }
  ],
  sample: [
    { id: 'characterizations', selector: '#characterizations', side: 'top' },
    { id: 'add', selector: tour('add-characterization'), side: 'bottom' },
    { id: 'duplicate', selector: tour('duplicate'), side: 'bottom' },
    { id: 'report', selector: tour('report'), side: 'bottom' },
    { id: 'more', selector: tour('more-actions'), side: 'bottom' }
  ]
};

/**
 * Which tour belongs to a page: the home page, a project, an experiment or a
 * sample. Forms and other pages have none.
 *
 * @param pathname - The page's path.
 */
export const tourIdForPath = (pathname: string): TourId | null => {
  if (pathname === '/') return 'home';

  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'projects') return null;
  if (parts.length === 2) return 'project';
  if (parts[2] === 'experiments' && parts.length === 4) return 'experiment';
  if (
    parts[2] === 'experiments' &&
    parts[4] === 'samples' &&
    parts.length === 6
  ) {
    // `new` is the add form, not a sample.
    return parts[5] === 'new' ? null : 'sample';
  }

  return null;
};

/**
 * The steps to show now: those for this kind of screen whose element is on the
 * page (a button can be missing in an empty state or before data exists).
 *
 * @param steps - A tour's steps.
 * @param options.isMobile - A phone, where the sidebar is a hidden menu.
 * @param options.exists - Whether an element matching the selector is on the page.
 */
export const buildSteps = (
  steps: TourStep[],
  options: { isMobile: boolean; exists: (selector: string) => boolean }
): TourStep[] =>
  steps.filter(step => {
    if (step.device === 'desktop' && options.isMobile) return false;
    if (step.device === 'mobile' && !options.isMobile) return false;

    return options.exists(step.selector);
  });
