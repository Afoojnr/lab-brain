import { expect, test } from '@playwright/test';

// The sidebar: the Projects row (the way home, with a chevron to collapse the
// list) and the techniques that can be analysed.
// Creates its own project, so it never depends on what another test, or an
// earlier run, left behind.
test('lists a new project in the sidebar and navigates to it and to a technique workspace', async ({
  page
}) => {
  const projectName = `Nav Project ${Date.now().toString().slice(-6)}`;
  const sidebar = page.locator('[data-slot="sidebar-container"]');

  // There is no Dashboard item: the Projects label is the way home, from anywhere.
  await page.goto('/settings');
  await expect(sidebar.getByRole('link', { name: /dashboard/i })).toHaveCount(
    0
  );
  await sidebar.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: 'Projects', level: 1 })
  ).toBeVisible();

  // The Projects row has no + of its own: a project is created on the page, and
  // it shows up in the sidebar list at once.
  await expect(
    sidebar.getByRole('button', { name: 'New project' })
  ).toHaveCount(0);
  await page
    .getByRole('main')
    .getByRole('button', { name: 'New project' })
    .click();
  await page.getByLabel('Name', { exact: true }).fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(
    sidebar.getByRole('link', { name: projectName, exact: true })
  ).toBeVisible();
  await sidebar.getByRole('link', { name: projectName, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: projectName, exact: true, level: 1 })
  ).toBeVisible();

  // The techniques that can be analysed are listed, each opening its workspace.
  await sidebar.getByRole('link', { name: 'EDX', exact: true }).click();
  await expect(page).toHaveURL(/\/characterization\/edx/);
  await expect(
    page.getByRole('heading', { name: 'EDX', level: 1 })
  ).toBeVisible();
  await sidebar
    .getByRole('link', { name: 'Ellipsometry', exact: true })
    .click();
  await expect(page).toHaveURL(/\/characterization\/ellipsometry/);

  // The headers collapse the two lists; what was closed stays closed after a reload.
  await sidebar
    .getByRole('button', { name: 'Characterizations', exact: true })
    .click();
  await expect(
    sidebar.getByRole('link', { name: 'EDX', exact: true })
  ).toBeHidden();
  await sidebar.getByRole('button', { name: 'Show or hide Projects' }).click();
  await expect(
    sidebar.getByRole('link', { name: projectName, exact: true })
  ).toBeHidden();
  await page.reload();
  await expect(
    sidebar.getByRole('button', { name: 'Show or hide Projects' })
  ).toBeVisible();
  await expect(
    sidebar.getByRole('link', { name: 'EDX', exact: true })
  ).toBeHidden();
  await expect(
    sidebar.getByRole('link', { name: projectName, exact: true })
  ).toBeHidden();
});
