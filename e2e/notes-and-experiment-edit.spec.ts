import { expect, test } from '@playwright/test';

test('shows a sample note on the table and the sample page', async ({
  page
}) => {
  const note = 'Example note: pulse changed after reactor service.';

  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');
  // The noted row carries its note for keyboard and screen reader users too.
  await expect(
    page.getByRole('row', { name: /ALD003/ }).getByText(note)
  ).toBeAttached();

  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1/samples/demo-sample-3'
  );
  await expect(page.getByText(note, { exact: true })).toBeVisible();
});

// Creates its own project: editing changes the experiment's name and prefix.
test('edits an experiment and records a note on a sample', async ({ page }) => {
  const projectName = `Edit Project ${Date.now().toString().slice(-6)}`;

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

  // Edit the experiment: a new name and a base protocol, shown under the title.
  await page.getByRole('button', { name: 'Edit experiment' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Plasma deposition');
  await dialog
    .getByLabel('Base protocol')
    .fill('Clean, pump down, run cycles.');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Plasma deposition', exact: true })
  ).toBeVisible();
  await expect(page.getByText('Clean, pump down, run cycles.')).toBeVisible();

  // A column, then a sample with a note.
  await page.getByRole('button', { name: 'Add column' }).click();
  const parameterDialog = page.getByRole('dialog');
  await parameterDialog.getByLabel('Name').fill('Pulse');
  await parameterDialog.getByLabel('Unit').fill('s');
  await parameterDialog.getByRole('button', { name: 'Add column' }).click();
  await expect(parameterDialog).toBeHidden();

  await page.getByRole('link', { name: 'Add sample' }).click();
  await page.getByLabel('Pulse (s)', { exact: true }).fill('5');
  await page
    .getByLabel('Note', { exact: true })
    .fill('Shortened after a leak.');
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(
    page.getByRole('heading', { name: 'ABC001', exact: true })
  ).toBeVisible();
  await expect(
    page.getByText('Shortened after a leak.', { exact: true })
  ).toBeVisible();

  // The edit form opens with the note already there.
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Note', { exact: true })).toHaveValue(
    'Shortened after a leak.'
  );
});
