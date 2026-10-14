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

/**
 * Opens a page's More actions (⋯) menu and picks an item (Edit, Delete). The
 * dev server hydrates the page while other tests run, and a click before that
 * is lost, so it presses again until the item is there.
 */
export const chooseFromMenu = async (page: Page, item: string | RegExp) => {
  await expect(async () => {
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: item }).click({ timeout: 3000 });
  }).toPass();
};
