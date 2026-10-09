import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';

// Flow 0b end to end: import a spreadsheet as a new experiment, then add rows
// from a CSV to the same experiment, updating one conflicting code. The files
// are built here from FAKE values, only to exercise the import. Creates its own
// project because the in-memory storage is shared and never reset.
const buildWorkbook = () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Sample', 'Power (W)', 'Remarks'],
    ['IMP001', 100, 'fake first'],
    ['IMP002', null, 'fake second']
  ]);
  // An Excel comment on the power cell of IMP001.
  sheet['B2'].c = [{ a: 'Fake', t: 'Fake re-measured' }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Fake deposition');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

test('imports a spreadsheet as a new experiment, then updates one row from a CSV', async ({
  page
}) => {
  const projectName = `Import Project ${Date.now().toString().slice(-6)}`;

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

  // New experiment from the workbook; the mapping is suggested from the headers.
  await page.getByRole('link', { name: 'Import from spreadsheet' }).click();
  await page.getByLabel('Spreadsheet file').setInputFiles({
    name: 'fake.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: buildWorkbook()
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(
    'Fake deposition'
  );
  await expect(page.getByLabel('Code prefix')).toHaveValue('IMP');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('2 new samples')).toBeVisible();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(
    page.getByText('2 samples added', { exact: false })
  ).toBeVisible();

  await page.getByRole('link', { name: 'Open the experiment' }).click();
  const table = page.getByRole('table').first();
  await expect(
    table.getByRole('link', { name: 'IMP001', exact: true })
  ).toBeVisible();
  await expect(
    table.getByRole('columnheader', { name: 'Power (W)' })
  ).toBeVisible();
  await expect(table.getByText('Not recorded').first()).toBeVisible();
  // The Excel comment became part of the sample's note.
  await expect(table).toContainText('Power (W): Fake re-measured');

  // Add rows to the same experiment: IMP001 exists, so it is a conflict.
  await page.getByRole('link', { name: 'Import rows' }).click();
  await page.getByLabel('Spreadsheet file').setInputFiles({
    name: 'fake.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Sample;Power (W)\nIMP001;250,5\nIMP003;300\n')
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('1 code already exists')).toBeVisible();
  await page
    .getByRole('row', { name: /IMP001/ })
    .getByRole('combobox')
    .click();
  await page
    .getByRole('option', { name: 'Update the existing sample' })
    .click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(
    page.getByText('1 sample added, 1 updated', { exact: false })
  ).toBeVisible();

  await page.getByRole('link', { name: 'Open the experiment' }).click();
  await expect(
    page.getByRole('table').first().getByText('250.5')
  ).toBeVisible();
  await expect(
    page.getByRole('table').first().getByRole('link', { name: 'IMP003' })
  ).toBeVisible();
});
