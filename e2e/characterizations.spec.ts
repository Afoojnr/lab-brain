import { expect, test } from '@playwright/test';

// Creates its own project. A technique can be recorded several times on a
// sample, a lowercase repeat is respelled to the project's spelling, and the
// samples table shows one badge per technique.
test('records, edits and deletes characterizations on a sample', async ({
  page
}) => {
  const projectName = `Measured Project ${Date.now().toString().slice(-6)}`;

  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Name').fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByText(projectName, { exact: true }).click();
  await expect(
    page.getByRole('heading', { name: projectName, exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name').fill('Deposition');
  await page.getByLabel('Code prefix').fill('abc');
  await page.getByRole('button', { name: 'Create experiment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Deposition', exact: true })
  ).toBeVisible();
  await page.getByRole('link', { name: 'Add sample' }).click();
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(
    page.getByRole('heading', { name: 'ABC001', exact: true })
  ).toBeVisible();
  await expect(page.getByText('No characterizations yet.')).toBeVisible();

  // Add SEM, then "sem" again on another date: it is respelled to "SEM".
  const add = async (technique: string, date: string) => {
    await page.getByRole('button', { name: 'Add characterization' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Technique').fill(technique);
    await dialog.getByLabel('Date measured').fill(date);
    await dialog.getByRole('button', { name: 'Add characterization' }).click();
    await expect(dialog).toBeHidden();
  };
  await add('SEM', '2026-09-15');
  await add('sem', '2026-09-20');
  await add('EDX', '2026-09-18');

  const table = page.getByRole('table');
  await expect(
    table.getByRole('cell', { name: 'SEM', exact: true })
  ).toHaveCount(2);
  await expect(
    table.getByRole('cell', { name: 'EDX', exact: true })
  ).toBeVisible();

  // The technique list offers what the project already uses.
  await page.getByRole('button', { name: 'Add characterization' }).click();
  await page.getByRole('button', { name: 'Use EDX' }).click();
  await expect(page.getByLabel('Technique')).toHaveValue('EDX');
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Edit EDX: add a note.
  await page.getByRole('button', { name: 'Edit EDX' }).click();
  await page.getByRole('dialog').getByLabel('Note').fill('Edge region');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('cell', { name: 'Edge region' })).toBeVisible();

  // Delete one SEM after confirming.
  await page.getByRole('button', { name: 'Delete SEM' }).first().click();
  await expect(page.getByText('Delete SEM?')).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    table.getByRole('cell', { name: 'SEM', exact: true })
  ).toHaveCount(1);

  // Back on the experiment, the table shows one badge per technique.
  await page
    .getByRole('link', { name: 'Deposition', exact: true })
    .first()
    .click();
  const row = page.getByRole('row', { name: /ABC001/ });
  await expect(row.getByText('SEM', { exact: true })).toBeVisible();
  await expect(row.getByText('EDX', { exact: true })).toBeVisible();
});
