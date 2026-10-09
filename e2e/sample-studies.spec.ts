import { expect, test } from '@playwright/test';

// Creates its own project so the demo data's next sample code stays untouched.
test('places a sample in several studies from the form and changes them on edit', async ({
  page
}) => {
  const projectName = `Studies Project ${Date.now().toString().slice(-6)}`;

  await page.goto('/');
  // The page's button.
  await page
    .getByRole('main')
    .getByRole('button', { name: 'New project' })
    .click();
  await page.getByLabel('Name', { exact: true }).fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  // The project card in the page, not the same name in the sidebar.
  await page.getByRole('main').getByText(projectName, { exact: true }).click();
  await expect(
    page.getByRole('heading', { name: projectName, exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Deposition');
  await page.getByLabel('Code prefix').fill('abc');
  await page.getByRole('button', { name: 'Create experiment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Deposition', exact: true })
  ).toBeVisible();

  // Two studies in this experiment.
  for (const name of ['Pulse study', 'TEB study']) {
    await page.getByRole('button', { name: 'New study' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill(name);
    await dialog.getByRole('button', { name: 'Create study' }).click();
    await expect(dialog).toBeHidden();
  }

  // Edit a study: rename it and add free notes as its description.
  await page.getByRole('button', { name: 'Edit TEB study' }).click();
  const editDialog = page.getByRole('dialog');
  await editDialog.getByLabel('Name', { exact: true }).fill('TEB dose study');
  await editDialog
    .getByLabel('Description')
    .fill('Just some notes, not a purpose.');
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(editDialog).toBeHidden();
  await expect(page.getByText('Study TEB dose study updated')).toBeVisible();
  await expect(
    page.getByText('Just some notes, not a purpose.', { exact: true })
  ).toBeVisible();

  // Add a sample and pick both studies from the dropdown.
  await page.getByRole('link', { name: 'Add sample' }).click();
  for (const name of ['Pulse study', 'TEB dose study']) {
    await page.getByLabel('Studies', { exact: true }).click();
    await page.getByRole('option', { name }).click();
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Save sample' }).click();

  await expect(
    page.getByRole('heading', { name: 'ABC001', exact: true })
  ).toBeVisible();
  await expect(page.getByText('Pulse study', { exact: true })).toBeVisible();
  await expect(page.getByText('TEB dose study', { exact: true })).toBeVisible();

  // Edit: remove one study with its chip's remove button.
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await page
    .locator('[data-slot="combobox-chip"]', { hasText: 'TEB dose study' })
    .getByRole('button')
    .click();
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(
    page.getByRole('heading', { name: 'ABC001', exact: true })
  ).toBeVisible();
  await expect(page.getByText('Pulse study', { exact: true })).toBeVisible();
  await expect(page.getByText('TEB dose study', { exact: true })).toBeHidden();
});
