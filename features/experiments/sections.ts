/** The sections of an experiment page, shown as tabs in this order. */
export const SECTION_TABS = ['protocol', 'setup', 'samples', 'plots'] as const;

export type SectionTab = (typeof SECTION_TABS)[number];

/**
 * The tab named in the URL, or undefined when it is missing or not one of the
 * four, so a wrong link still opens the experiment on its default tab.
 *
 * @param value - The `tab` search parameter.
 */
export const parseSectionTab = (value: unknown): SectionTab | undefined =>
  SECTION_TABS.find(tab => tab === value);

/**
 * Where an experiment opens when no tab is asked for: its samples, or, while it
 * has none yet, its setup (columns first), which is where a new experiment
 * starts.
 *
 * @param sampleCount - How many samples the experiment has.
 */
export const defaultSectionTab = (sampleCount: number): SectionTab =>
  sampleCount > 0 ? 'samples' : 'setup';
