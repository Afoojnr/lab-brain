import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Opens one of an experiment page's section tabs and waits until it is the current one. */
export const openTab = async (
  page: Page,
  name: 'Samples' | 'Plots' | 'Protocol' | 'Setup'
) => {
  const tab = page
    .getByRole('navigation', { name: 'Experiment sections' })
    .getByRole('link', { name: new RegExp(`^${name}`) });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-current', 'page');
};
