import { expect, test } from '@playwright/test';

// Reports are read-only views of the demo project, so they never change what
// other tests rely on. The saved plot test makes its own plot and removes it.
test('opens a sample report from the sample page and shows what was and was not recorded', async ({
  page
}) => {
  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1/samples/demo-sample-1'
  );
  await page.getByRole('link', { name: 'Report', exact: true }).click();

  await expect(page).toHaveURL(/\/report\/projects\/demo-project-1/);
  await expect(
    page.getByRole('heading', { name: 'ALD001', level: 1 })
  ).toBeVisible();
  await expect(page.getByText('Sample report', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Parameters', level: 2 })
  ).toBeVisible();
  // Cycles was never recorded for this sample: it says so, it is not 0.
  await expect(
    page.getByRole('row', { name: /Cycles/ }).getByText('Not recorded')
  ).toBeVisible();
  await expect(page.getByRole('row', { name: /Plasma power/ })).toContainText(
    '100'
  );

  // The toolbar is for the screen only: it does not print.
  const print = page.getByRole('button', { name: 'Print / Save as PDF' });
  await expect(print).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(print).toBeHidden();
});

test('opens an experiment summary that says what varied, what stayed the same and how the results came out', async ({
  page
}) => {
  const saved = `Figure ${Date.now().toString().slice(-6)}`;
  await page.goto(
    '/plots?source=experiment&project=demo-project-1&experiment=demo-experiment-1'
  );
  await page.getByRole('button', { name: 'Save plot', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(saved);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(page.getByText(`Plot ${saved} saved`)).toBeVisible();

  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');
  // A click before the page has hydrated can be lost, so try again until it lands.
  await expect(async () => {
    await page.getByRole('link', { name: 'Summary', exact: true }).click();
    await expect(page).toHaveURL(
      /\/report\/projects\/demo-project-1\/experiments/,
      { timeout: 4000 }
    );
  }).toPass();
  await expect(
    page.getByRole('heading', { name: 'Deposition', level: 1 })
  ).toBeVisible();
  await expect(
    page.getByText('Experiment summary', { exact: true })
  ).toBeVisible();

  // Temperature changed between samples: its values and range are listed once.
  const varied = page.getByRole('row', { name: /^Temperature/ });
  await expect(varied).toContainText('150, 200, 250, 300');
  await expect(varied).toContainText('150 – 300');
  // Purge never changed: it is listed as one value.
  const same = page.getByRole('row', { name: /^Purge/ });
  await expect(same).toContainText('10');
  // Results: how many samples have a thickness, and the mean.
  const thickness = page.getByRole('row', { name: /^Thickness/ });
  await expect(thickness).toContainText(/\d+ of \d+/);
  // The samples table is not repeated here: its codes are not rows of this page.
  await expect(page.getByRole('row', { name: /ALD007/ })).toHaveCount(0);

  // The saved plot is drawn as a figure with its title.
  const figure = page.getByRole('figure').filter({ hasText: saved });
  await expect(figure).toBeVisible();
  await expect(
    figure.locator('.recharts-scatter-symbol').first()
  ).toBeVisible();

  // It renders as a PDF.
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true });
  expect(pdf.length).toBeGreaterThan(5000);

  // Clean up the plot made for this test.
  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1?tab=plots'
  );
  await expect(async () => {
    await page.getByRole('button', { name: `Delete ${saved}` }).click();
    await expect(page.getByText('Delete this saved plot?')).toBeVisible({
      timeout: 4000
    });
  }).toPass();
  await page.getByRole('button', { name: 'Delete plot', exact: true }).click();
  await expect(page.getByText(`Plot ${saved} deleted`)).toBeVisible();
});

test('does not open a report for a sample that is not in the experiment', async ({
  page
}) => {
  const response = await page.goto(
    '/report/projects/demo-project-1/experiments/demo-experiment-2/samples/demo-sample-1'
  );

  expect(response?.status()).toBe(404);
});
