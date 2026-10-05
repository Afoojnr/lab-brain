import { expect, test } from '@playwright/test';

// Creates its own project: editing changes its name and description.
test('edits a project and folds a long description behind Show more', async ({
  page
}) => {
  const projectName = `Edit Me ${Date.now().toString().slice(-6)}`;
  const renamed = `${projectName} renamed`;

  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Name').fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByText(projectName, { exact: true }).click();
  await expect(
    page.getByRole('heading', { name: projectName, exact: true })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Edit project' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(renamed);
  await dialog
    .getByLabel('Description')
    .fill('A long description line that wraps over the page. '.repeat(12));
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toBeHidden();

  await expect(
    page.getByRole('heading', { name: renamed, exact: true })
  ).toBeVisible();
  // Folded to a few lines until the toggle is used.
  await page.getByRole('button', { name: 'Show more' }).click();
  await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible();
  await page.getByRole('button', { name: 'Show less' }).click();
  await expect(page.getByRole('button', { name: 'Show more' })).toBeVisible();
});
