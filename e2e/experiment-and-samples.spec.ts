import { expect, test } from '@playwright/test';

// Flows 0 and 1 end to end: a project with an experiment, its columns, and samples
// added, duplicated and edited. Creates its own project, so it never depends
// on what another test, or an earlier run, left behind.
test('builds an experiment with columns and records, duplicates and edits samples', async ({
  page
}) => {
  // Unique per run: the data layer is in memory until Step 6.
  const projectName = `Experiment Project ${Date.now().toString().slice(-6)}`;

  // A project, then its first experiment.
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Name').fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByText(projectName, { exact: true }).click();
  // Wait for the project page before asserting: the dashboard cards also say
  // "No experiments yet".
  await expect(
    page.getByRole('heading', { name: projectName, exact: true })
  ).toBeVisible();
  await expect(page.getByText('No experiments yet')).toBeVisible();
  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name').fill('Deposition');
  await page.getByLabel('Code prefix').fill('abc');
  await page.getByRole('button', { name: 'Create experiment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Deposition', exact: true })
  ).toBeVisible();
  await expect(page.getByText('No samples yet.')).toBeVisible();

  // Two columns, each with a default.
  for (const [name, unit, defaultValue] of [
    ['Plasma power', 'W', '100'],
    ['Pulse', 's', '10']
  ]) {
    await page.getByRole('button', { name: 'Add column' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByLabel('Unit').fill(unit);
    await dialog.getByLabel('Default value').fill(defaultValue);
    await dialog.getByRole('button', { name: 'Add column' }).click();
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
    // Wait for the dialog to finish closing: its submit button shares the
    // trigger's name while it animates out.
    await expect(dialog).toBeHidden();
  }

  // Add a sample: the next code and the defaults are prefilled.
  await page.getByRole('link', { name: 'Add sample' }).click();
  await expect(page.getByLabel('Sample code')).toHaveValue('ABC001');
  await expect(
    page.getByLabel('Plasma power (W)', { exact: true })
  ).toHaveValue('100');
  await expect(page.getByLabel('Pulse (s)', { exact: true })).toHaveValue('10');
  await page.getByLabel('Pulse (s)', { exact: true }).fill('5');
  await page.getByLabel('Implementation').fill('First sample of the study.');

  // Text in a number column is an error on that exact field, never saved as zero.
  await page.getByLabel('Plasma power (W)', { exact: true }).fill('lots');
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(
    page.getByText('Enter a number, for example 1.5.')
  ).toBeVisible();
  await expect(
    page.getByLabel('Plasma power (W)', { exact: true })
  ).toBeFocused();
  await page.getByLabel('Plasma power (W)', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Save sample' }).click();

  // The sample's page: implementation leads, values are recorded with units.
  await expect(
    page.getByRole('heading', { name: 'ABC001', exact: true })
  ).toBeVisible();
  await expect(
    page.getByText('First sample of the study.', { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('row').filter({ hasText: 'Plasma power' })
  ).toContainText('100 W');
  await expect(
    page.getByRole('row').filter({ hasText: 'Pulse' })
  ).toContainText('5 s');

  // Duplicate: a new code, with the values copied for editing.
  await page.getByRole('link', { name: 'Duplicate' }).click();
  await expect(
    page.getByRole('heading', { name: 'Duplicate ABC001' })
  ).toBeVisible();
  await expect(page.getByLabel('Sample code')).toHaveValue('ABC002');
  await expect(page.getByLabel('Pulse (s)', { exact: true })).toHaveValue('5');
  await page.getByLabel('Pulse (s)', { exact: true }).fill('15');

  // A code already used in the project is rejected, before anything is saved.
  await page.getByLabel('Sample code').fill('abc001');
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(
    page.getByText('Another sample in this project already has this code.')
  ).toBeVisible();
  await page.getByLabel('Sample code').fill('ABC002');
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(
    page.getByRole('heading', { name: 'ABC002', exact: true })
  ).toBeVisible();

  // Edit: record an observation.
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Observation').fill('Looks uniform.');
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(page.getByText('Looks uniform.', { exact: true })).toBeVisible();

  // Back on the experiment: both samples are rows of the table.
  await page
    .getByRole('navigation', { name: 'breadcrumb' })
    .getByRole('link', { name: 'Deposition' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Deposition', exact: true })
  ).toBeVisible();
  const firstRow = page.getByRole('row').filter({ hasText: 'ABC001' });
  await expect(firstRow).toContainText('First sample of the study.');
  await expect(
    page.getByRole('row').filter({ hasText: 'ABC002' })
  ).toContainText('15');

  // A column added later: older samples show it empty, nothing is back-filled.
  await page.getByRole('button', { name: 'Add column' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Cycles');
  await dialog.getByRole('button', { name: 'Add column' }).click();
  await expect(
    page.getByRole('columnheader', { name: 'Cycles' })
  ).toBeVisible();
  await expect(firstRow.getByText('Not recorded').first()).toBeAttached();

  // A column that samples hold values for cannot be deleted.
  await expect(
    page.getByRole('button', { name: 'Delete Plasma power' })
  ).toBeDisabled();
});
