import { expect, test } from '@playwright/test';

import { openTab } from './helpers';

// Reads the demo experiment only, so it never changes what other tests rely on.
test('switches between the four sections in order, keeping the tab in the URL', async ({
  page
}) => {
  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');
  const nav = page.getByRole('navigation', { name: 'Experiment sections' });

  // The order is Protocol, Setup, Samples, Plots.
  await expect(nav.getByRole('link')).toHaveText([
    'Protocol',
    'Setup',
    /^Samples\s*23$/,
    /^Plots/
  ]);

  // The demo experiment has samples, so it opens on Samples (with its count).
  await expect(nav.getByRole('link', { name: /^Samples/ })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(page.getByRole('table').first()).toBeVisible();

  // Plots: the saved plot cards, not the table.
  await openTab(page, 'Plots');
  await expect(page).toHaveURL(/tab=plots/);
  await expect(page.getByRole('table')).toHaveCount(0);

  // Setup: the columns, the calculated columns and the studies together.
  await openTab(page, 'Setup');
  await expect(page).toHaveURL(/tab=setup/);
  await expect(page.getByRole('button', { name: 'Add column' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New study' })).toBeVisible();

  // The browser's Back button moves between tabs.
  await openTab(page, 'Protocol');
  await page.goBack();
  await expect(page).toHaveURL(/tab=setup/);
});

test('opens a new experiment on Setup, with its two steps, and the Samples tab says it is empty', async ({
  page
}) => {
  const projectName = `Sections Project ${Date.now().toString().slice(-6)}`;
  await page.goto('/');
  await page
    .getByRole('main')
    .getByRole('button', { name: 'New project' })
    .click();
  await page.getByLabel('Name', { exact: true }).fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByRole('main').getByText(projectName, { exact: true }).click();
  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Deposition');
  await page.getByLabel('Code prefix').fill('abc');
  await page.getByRole('button', { name: 'Create experiment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Deposition', exact: true })
  ).toBeVisible();

  // No samples yet: it opens on Setup, where the getting-started steps are.
  const nav = page.getByRole('navigation', { name: 'Experiment sections' });
  await expect(nav.getByRole('link', { name: 'Setup' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(page.getByText('Getting started')).toBeVisible();

  await openTab(page, 'Samples');
  await expect(page.getByText(/No samples yet/)).toBeVisible();
});

test('opens the tab named in the link, and falls back to Samples for a wrong one', async ({
  page
}) => {
  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1?tab=setup'
  );
  await expect(page.getByRole('button', { name: 'Add column' })).toBeVisible();

  // A wrong tab name opens the default: the samples, since the demo has some.
  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1?tab=nonsense'
  );
  await expect(page.getByRole('table').first()).toBeVisible();
});

test('fits a phone: the tab bar is reachable and the page does not scroll sideways', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');
  await openTab(page, 'Protocol');

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
