import { expect, test } from '@playwright/test';

// Read-only checks against the built-in demo data, so they create nothing and
// never collide with other tests.
test("lists a project's experiments with how many samples and columns each has", async ({
  page
}) => {
  await page.goto('/projects/demo-project-1');

  const deposition = page.getByRole('link', { name: /Deposition/ });
  await expect(deposition).toContainText('ALD');
  await expect(deposition).toContainText('7 samples');
  await expect(deposition).toContainText('10 columns');
  await expect(page.getByRole('link', { name: /Paschen law/ })).toContainText(
    '2 samples'
  );
});

test('shows an experiment like a spreadsheet, with columns added later left empty', async ({
  page
}) => {
  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');

  await expect(
    page.getByRole('columnheader', { name: 'Plasma pulse (s)' })
  ).toBeVisible();
  // Cycles was added after the first samples, so they show it as not recorded.
  const firstRow = page.getByRole('row').filter({ hasText: 'ALD001' }).first();
  await expect(firstRow.getByText('Not recorded').first()).toBeAttached();
  // An annealing sample keeps its own code.
  await expect(
    page.getByRole('link', { name: 'ALD003_Annealing', exact: true })
  ).toBeVisible();
});

test('switches between experiments with the tabs, like the sheets of a spreadsheet', async ({
  page
}) => {
  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');

  await page
    .getByRole('navigation', { name: 'Experiments in this project' })
    .getByRole('link', { name: /Paschen law/ })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Paschen law', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'PSL001', exact: true })
  ).toBeVisible();
});

test('suggests the next code from the highest one in the project', async ({
  page
}) => {
  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1/samples/new'
  );

  // ALD006 is the highest plain code; ALD003_Annealing does not count.
  await expect(page.getByLabel('Sample code')).toHaveValue('ALD007');
});

test('shows the recorded values of a demo sample with their units', async ({
  page
}) => {
  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1/samples/demo-sample-3'
  );

  await expect(
    page.getByRole('heading', { name: 'ALD003', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('row').filter({ hasText: 'Plasma pulse' })
  ).toContainText('15 s');
});

test('does not show an experiment under a project it does not belong to', async ({
  page
}) => {
  await page.goto('/projects/demo-project-2/experiments/demo-experiment-1');

  await expect(page.getByText('This page could not be found.')).toBeVisible();
});

test('duplicating copies the values and implementation but not the observation', async ({
  page
}) => {
  // demo-sample-1 (ALD001) has both an implementation and an observation.
  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1/samples/new?duplicateOf=demo-sample-1'
  );

  await expect(
    page.getByRole('heading', { name: 'Duplicate ALD001' })
  ).toBeVisible();
  await expect(page.getByLabel('Sample code')).toHaveValue('ALD007');
  await expect(
    page.getByLabel('Plasma pulse (s)', { exact: true })
  ).toHaveValue('5');
  await expect(page.getByLabel('Implementation')).not.toHaveValue('');
  await expect(page.getByLabel('Observation')).toHaveValue('');
});
