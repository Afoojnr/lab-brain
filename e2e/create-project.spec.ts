import { expect, test } from '@playwright/test';

// The one flow that must never break: opening the dashboard, creating a
// project through the real dialog, and seeing it actually land in the grid.
// Everything underneath this (validation rules, the action, the form's error
// states) is already covered by faster tests; this proves they're wired together.
test('creates a project from the dashboard', async ({ page }) => {
  // Unique per run: data/projects.ts is a real in-memory list for now (no
  // database until Step 4), so a fixed name or prefix would collide with
  // whatever an earlier run left behind.
  const uniqueSuffix = Date.now().toString().slice(-4);
  const projectName = `Playwright Project ${uniqueSuffix}`;
  const codePrefix = `P${uniqueSuffix}`;

  await page.goto('/');

  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Name').fill(projectName);
  await page.getByLabel('Code prefix').fill(codePrefix);

  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page.getByText(`Project ${projectName} created`)).toBeVisible();
  // exact: true, because the toast text above contains this name as a
  // substring too, and getByText matches substrings by default.
  await expect(page.getByText(projectName, { exact: true })).toBeVisible();
  await expect(page.getByText(codePrefix, { exact: true })).toBeVisible();
});
