import { expect, test } from '@playwright/test';

// The first flow that must never break: opening the projects page, creating a
// project through the real dialog, and seeing it actually land in the grid.
// Everything underneath this (validation rules, the action, the form's error
// states) is already covered by faster tests; this proves they're wired together.
test('creates a project from the projects page', async ({ page }) => {
  // Unique per run: data/projects.ts is a real in-memory list for now (no
  // database until Step 6), so a fixed name would collide with the card a
  // previous run left behind.
  const projectName = `Playwright Project ${Date.now().toString().slice(-6)}`;

  await page.goto('/');

  // The page's button.
  await page
    .getByRole('main')
    .getByRole('button', { name: 'New project' })
    .click();
  await page.getByLabel('Name', { exact: true }).fill(projectName);

  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page.getByText(`Project ${projectName} created`)).toBeVisible();
  // exact: true, because the toast text above contains this name as a
  // substring too, and getByText matches substrings by default.
  await expect(
    page.getByRole('main').getByText(projectName, { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: new RegExp(projectName) })
  ).toContainText('No experiments yet');
});
