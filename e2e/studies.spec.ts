import { expect, test } from '@playwright/test';

// Flow 1 part B: name a study, tag samples with it in bulk, then filter and
// search the table. Runs against the demo experiment; the study name is
// unique per run because the in-memory storage is never reset between runs.
test('tags samples with a new study, filters by it and searches the table', async ({
  page
}) => {
  const name = `Study ${Date.now()}`;
  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');

  await page.getByRole('button', { name: 'New study' }).click();
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Create study' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(
    page.getByRole('link', { name: `Show samples of ${name}` })
  ).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select ALD001' }).click();
  await page.getByRole('checkbox', { name: 'Select ALD002' }).click();
  await expect(page.getByText('2 samples selected')).toBeVisible();
  await page.getByRole('button', { name: `Assign to ${name}` }).click();
  await expect(page.getByText('2 samples selected')).toBeHidden();

  await page.getByRole('link', { name: name, exact: true }).first().click();
  await expect(page).toHaveURL(/study=/);
  const table = page.getByRole('table');
  await expect(
    table.getByRole('link', { name: 'ALD001', exact: true })
  ).toBeVisible();
  await expect(
    table.getByRole('link', { name: 'ALD002', exact: true })
  ).toBeVisible();
  await expect(
    table.getByRole('link', { name: 'ALD003', exact: true })
  ).toBeHidden();

  // Search narrows within the chosen study, and nothing matching says so.
  await page
    .getByRole('searchbox', { name: 'Search samples' })
    .fill('zzz-no-match');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No samples match these filters.')).toBeVisible();

  await page.getByRole('link', { name: 'Clear filters' }).click();
  await page
    .getByRole('searchbox', { name: 'Search samples' })
    .fill('annealing');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    page.getByRole('table').getByRole('link', { name: 'ALD003_Annealing' })
  ).toBeVisible();
  await expect(
    page.getByRole('table').getByRole('link', { name: 'ALD001', exact: true })
  ).toBeHidden();
});
