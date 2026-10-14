import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// FTIR end to end. Every spectrum is FAKE: built here (a flat baseline with two
// invented dips) in the layout of the owner's export (`;` between columns and a
// decimal comma), only to exercise reading, peak detection and curation,
// stacking, and sending values to the result columns.
const spectrum = (deepDip: number) => {
  const rows: string[] = [];
  for (let wavenumber = 600; wavenumber <= 4000; wavenumber += 2) {
    const value =
      80 -
      deepDip * Math.exp(-(((wavenumber - 1100) / 25) ** 2)) -
      20 * Math.exp(-(((wavenumber - 1650) / 20) ** 2));
    rows.push(
      `${wavenumber.toFixed(4).replace('.', ',')};${value.toFixed(4).replace('.', ',')}`
    );
  }

  return rows.join('\r\n');
};

const file = (name: string, deepDip: number) => ({
  name,
  mimeType: 'text/csv',
  buffer: Buffer.from(spectrum(deepDip))
});

const peakPositions = (page: Page) =>
  page
    .locator('input[id^="peak-position-"]')
    .evaluateAll(inputs =>
      inputs.map(input => (input as HTMLInputElement).value)
    );

test('reads dropped spectra, detects peaks, lets you curate and label them, and exports', async ({
  page
}) => {
  await page.goto('/characterization/ftir?source=upload');
  await page
    .getByLabel('Fit files to analyse')
    .setInputFiles([file('FAKE-a.csv', 40), file('FAKE-b.csv', 25)]);

  // Both spectra are stacked, and the values are read as percent transmittance.
  await expect(page.getByTestId('ftir-chart')).toBeVisible();
  await expect(
    page.getByText('The values run up to about 100 and stay high')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Detect peaks' }).click();
  await expect.poll(() => peakPositions(page)).toHaveLength(2);
  const [first] = await peakPositions(page);
  expect(Math.abs(Number(first) - 1100)).toBeLessThanOrEqual(4);

  // Label one, remove the other.
  await page.getByLabel(/Label for the peak at 11/).fill('B–C stretch');
  await page.getByRole('button', { name: /Remove the peak at 16/ }).click();
  await expect.poll(() => peakPositions(page)).toHaveLength(1);

  // Detecting again keeps the labelled peak as it is.
  await page.getByRole('button', { name: 'Detect peaks' }).click();
  await expect(page.getByLabel(/Label for the peak at 11/)).toHaveValue(
    'B–C stretch'
  );

  // Add one by its position.
  await page.getByLabel('Position of the new peak (cm⁻¹)').fill('2900');
  await page.getByRole('button', { name: 'Add peak', exact: true }).click();
  await expect.poll(() => peakPositions(page)).toContain('2900');

  // Switching the reading changes what the peaks point at, without touching the file.
  await page.getByLabel('The values are').click();
  await page.getByRole('option', { name: 'Absorbance' }).click();
  await expect(
    page.getByText('The values run up to about 100 and stay high')
  ).toBeHidden();

  // Export the figure and the peak values.
  for (const [item, fileName] of [
    ['Picture (PNG)', 'ftir-spectra.png'],
    ['PDF', 'ftir-spectra.pdf'],
    ['Excel table', 'ftir-spectra.xlsx']
  ] as const) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('menuitem', { name: item }).click();
    expect((await download).suggestedFilename()).toBe(fileName);
  }
});

test('compares the FTIR measurements of an experiment and sends peak values to a result column', async ({
  page
}) => {
  // A long flow: two samples, two measurements, a comparison and an apply.
  test.setTimeout(120_000);
  const projectName = `FTIR Project ${Date.now().toString().slice(-6)}`;

  await page.goto('/');
  await page
    .getByRole('main')
    .getByRole('button', { name: 'New project' })
    .click();
  await page.getByLabel('Name', { exact: true }).fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByRole('main').getByText(projectName, { exact: true }).click();
  await expect(
    page.getByRole('heading', { name: projectName, exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Deposition');
  await page.getByLabel('Code prefix').fill('abc');
  await page.getByRole('button', { name: 'Create experiment' }).click();

  const measure = async (code: string, name: string, deepDip: number) => {
    await page.getByRole('link', { name: 'Add sample' }).click();
    await page.getByRole('button', { name: 'Save sample' }).click();
    await expect(
      page.getByRole('heading', { name: code, exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Add characterization' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Technique').fill('FTIR');
    await dialog.getByLabel('Date measured').fill('2026-09-14');
    await dialog.getByRole('button', { name: 'Add characterization' }).click();
    await expect(dialog).toBeHidden();
    await page
      .getByRole('main')
      .getByRole('link', { name: 'FTIR', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'FTIR', level: 1 })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Attach files to FTIR' }).click();
    await page.getByLabel('Files to attach').setInputFiles(file(name, deepDip));
    await expect(page.getByRole('dialog')).toBeHidden();
    // The spectrum is read and drawn on the sample's own page.
    await expect(page.getByTestId('ftir-chart')).toBeVisible();
    await page
      .getByRole('navigation', { name: 'breadcrumb' })
      .getByRole('link', { name: 'Deposition', exact: true })
      .click();
  };
  await measure('ABC001', 'FAKE-a.csv', 40);
  await measure('ABC002', 'FAKE-b.csv', 20);

  // The comparison: the experiment's FTIR measurements, stacked.
  await page.goto('/characterization/ftir?source=experiment');
  await page.getByLabel('Project', { exact: true }).click();
  await page.getByRole('option', { name: projectName }).click();
  await page.getByLabel('Experiment', { exact: true }).click();
  await page.getByRole('option', { name: 'Deposition' }).click();
  await expect(page.getByTestId('ftir-chart')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /^ABC001/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /^ABC002/ })).toBeChecked();

  // One list of peaks for the stack.
  await page.getByRole('button', { name: 'Detect peaks' }).click();
  await expect.poll(() => peakPositions(page)).toHaveLength(2);
  await page.getByRole('button', { name: /Remove the peak at 16/ }).click();
  await expect.poll(() => peakPositions(page)).toHaveLength(1);

  // Send the value at the remaining peak to a new result column for both samples.
  await page
    .getByRole('checkbox', { name: /^11\d\d cm⁻¹/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Apply to 2 samples/ }).click();
  await expect(page.getByText('2 samples updated')).toBeVisible();

  // The new column is on the experiment's table, with a value for each sample.
  await page.goto('/');
  await page.getByRole('main').getByText(projectName, { exact: true }).click();
  await page
    .getByRole('main')
    .getByRole('link', { name: /Deposition/ })
    .first()
    .click();
  await expect(
    page
      .getByRole('table')
      .first()
      .getByRole('columnheader', { name: /^11\d\d cm⁻¹/ })
  ).toBeVisible();
});

test('keeps a bond table you fill by hand or paste, and offers its bonds for detected peaks', async ({
  page
}) => {
  // The table is shared by the whole app, so every name here is unique to this run.
  const unique = Date.now().toString().slice(-6);
  const typed = `Typed ${unique}`;
  const pasted = `Pasted ${unique}`;

  await page.goto('/characterization/ftir?source=bonds');
  await expect(
    page.getByRole('heading', { name: 'Bond table', exact: true })
  ).toBeVisible();

  // By hand: a range with its source.
  await page.getByRole('button', { name: 'Add a bond' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Bond or label').fill(typed);
  await dialog.getByLabel('From (cm⁻¹)').fill('1050');
  await dialog.getByLabel('To (cm⁻¹)').fill('1150');
  await dialog.getByLabel('Source').fill('my own note');
  await dialog.getByRole('button', { name: 'Save bond' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('cell', { name: typed, exact: true })
  ).toBeVisible();

  // By pasting (tab-separated, as copied from Excel): one good row, one bad.
  await page
    .getByLabel('Paste rows')
    .fill(
      `Bond\tFrom (cm-1)\tTo (cm-1)\tSource\n${pasted}\t1380\t\tfrom a book\nBad row\tabout 5\t\t`
    );
  await page.getByRole('button', { name: 'Read the table' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'cannot be used' })
  ).toContainText('Row 3, From: “about 5” is not a number.');
  await page.getByRole('button', { name: 'Add 1 bond' }).click();
  await expect(
    page.getByRole('cell', { name: pasted, exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Bad row', exact: true })
  ).toHaveCount(0);

  // A peak near 1100 is offered the typed bond; picking it labels the peak.
  await page.goto('/characterization/ftir?source=upload');
  await page
    .getByLabel('Fit files to analyse')
    .setInputFiles(file('FAKE-a.csv', 40));
  await page.getByRole('button', { name: 'Detect peaks' }).click();
  await expect.poll(() => peakPositions(page)).toHaveLength(2);
  await page
    .getByRole('button', { name: new RegExp(`^Use ${typed} \\(1050–1150\\)`) })
    .click();
  await expect(page.getByLabel(/Label for the peak at 11/)).toHaveValue(typed);

  // Remove the typed bond: the table drops it, the peak keeps its label.
  await page.goto('/characterization/ftir?source=bonds');
  await page.getByRole('button', { name: `Delete ${typed}` }).click();
  await page.getByRole('button', { name: 'Delete bond' }).click();
  await expect(
    page.getByRole('cell', { name: typed, exact: true })
  ).toHaveCount(0);
});
