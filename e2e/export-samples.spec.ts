import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';

// Reads the demo experiment only, so it never changes what other tests rely on.
test('downloads the samples table as Excel with a sheet for columns, studies and measurements', async ({
  page
}) => {
  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');
  const downloading = page.waitForEvent('download');
  await expect(async () => {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: /Excel/ })).toBeVisible({
      timeout: 4000
    });
  }).toPass();
  await page.getByRole('menuitem', { name: /Excel/ }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe('deposition.xlsx');
  const workbook = XLSX.read(readFileSync(await download.path()), {
    type: 'buffer'
  });
  expect(workbook.SheetNames).toEqual([
    'Samples',
    'Columns',
    'Studies',
    'Measurements'
  ]);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets.Samples
  );
  const first = rows.find(row => row.Sample === 'ALD001');
  // Numbers stay numbers; a value never recorded is an empty cell, not 0.
  expect(first?.['Temperature (°C)']).toBe(200);
  expect(first?.['Cycles']).toBeUndefined();
  expect(rows.length).toBeGreaterThanOrEqual(23);
});

test('exports only the ticked rows', async ({ page }) => {
  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');
  // A click before the page has hydrated can be lost; `check` is safe to repeat.
  await expect(async () => {
    await page.getByRole('checkbox', { name: 'Select ALD001' }).check();
    await page.getByRole('checkbox', { name: 'Select ALD002' }).check();
    await expect(
      page.getByRole('checkbox', { name: 'Select ALD002' })
    ).toBeChecked({
      timeout: 4000
    });
  }).toPass();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByText('The 2 selected samples')).toBeVisible();

  const downloading = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /CSV/ }).click();
  const download = await downloading;
  const text = readFileSync(await download.path(), 'utf8');

  expect(download.suggestedFilename()).toBe('deposition.csv');
  expect(text).toContain('ALD001');
  expect(text).toContain('ALD002');
  expect(text).not.toContain('ALD003');
});
