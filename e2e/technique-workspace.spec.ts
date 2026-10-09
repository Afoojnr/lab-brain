import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';

// The technique workspace from the sidebar. Every file is FAKE: built here with
// invented numbers in the layout the microscope exports, only to exercise the
// upload and the batch. Creates its own project, so it never depends on what
// another test, or an earlier run, left behind.
const quantification = (b: number, n: number) =>
  `Atomic number,Element symbol,Element name,Atomic concentration percentage,Weight concentration percentage,Energy level\n5,B,Boron,${b},0.1,10000\n7,N,Nitrogen,${n},0.1,10000\n`;

/** A sample folder `<name>/export/spot_N/quantification.csv`: spots B 50 / 40 / 60 %, N 30 % (B/N = 50/30). */
const writeSample = (root: string, name: string) => {
  for (const [index, b] of [0.5, 0.4, 0.6].entries()) {
    const spot = path.join(root, name, 'export', `spot_${index + 1}`);
    mkdirSync(spot, { recursive: true });
    writeFileSync(
      path.join(spot, 'quantification.csv'),
      quantification(b, 0.3)
    );
  }

  return path.join(root, name);
};

test('analyses dropped folders without an experiment and downloads the Excel summary', async ({
  page
}) => {
  // A day's folder holding two samples.
  const day = path.join(
    mkdtempSync(path.join(tmpdir(), 'lab-brain-ws-')),
    '2026-05-22'
  );
  writeSample(day, 'ABC001');
  writeSample(day, 'ABC002');

  await page.goto('/characterization/edx');
  await page.getByLabel('Folders to analyse').setInputFiles(day);

  // Each folder inside is a sample, with the ratio averaged over its spots.
  const first = page.getByRole('row', { name: /ABC001/ });
  await expect(first).toBeVisible();
  await expect(page.getByRole('row', { name: /ABC002/ })).toBeVisible();
  await expect(first.getByText('1.66667')).toBeVisible(); // 50 / 30

  // Leave a spot out of one sample: only that sample changes; nothing is deleted.
  await page.getByRole('button', { name: 'Show the spots of ABC001' }).click();
  await page.getByRole('checkbox', { name: 'Include spot_2' }).click();
  await expect(first.getByText('1.83333')).toBeVisible(); // 55 / 30
  await expect(
    page.getByRole('row', { name: /ABC002/ }).getByText('1.66667')
  ).toBeVisible();

  // The summary downloads as Excel with one row per sample.
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Excel' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('EDS_summary.xlsx');
  const workbook = XLSX.read(readFileSync((await download.path()) ?? ''));
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[workbook.SheetNames[0] ?? ''] ?? {}
  );
  expect(rows.map(row => row.ID)).toEqual(['ABC001', 'ABC002']);
  expect(rows[0]?.['B/N']).toBeCloseTo(55 / 30, 6);
  expect(rows[1]?.['B/N']).toBeCloseTo(50 / 30, 6);
});

test('applies an experiment batch: fills the empty cell and skips the one it would overwrite', async ({
  page
}) => {
  const projectName = `Batch Project ${Date.now().toString().slice(-6)}`;
  const main = page.getByRole('main');

  await page.goto('/');
  // The page's button.
  await page
    .getByRole('main')
    .getByRole('button', { name: 'New project' })
    .click();
  await page.getByLabel('Name', { exact: true }).fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await main.getByText(projectName, { exact: true }).click();
  await expect(
    page.getByRole('heading', { name: projectName, exact: true, level: 1 })
  ).toBeVisible();
  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Deposition');
  await page.getByLabel('Code prefix').fill('abc');
  await page.getByRole('button', { name: 'Create experiment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Deposition', exact: true, level: 1 })
  ).toBeVisible();

  // A result column the ratio will go to.
  await page.getByRole('button', { name: 'Add column' }).click();
  const column = page.getByRole('dialog');
  await column.getByLabel('Name', { exact: true }).fill('B/N');
  await column.getByLabel('Category').click();
  await page.getByRole('option', { name: 'Result' }).click();
  await column.getByRole('button', { name: 'Add column' }).click();
  await expect(column).toBeHidden();

  const samples = mkdtempSync(path.join(tmpdir(), 'lab-brain-batch-'));
  // ABC001 has no B/N yet; ABC002 already holds 9, which the batch must not overwrite unasked.
  for (const [code, existing] of [
    ['ABC001', ''],
    ['ABC002', '9']
  ] as const) {
    await page.getByRole('link', { name: 'Add sample' }).click();
    if (existing) await page.getByLabel('B/N', { exact: true }).fill(existing);
    await page.getByRole('button', { name: 'Save sample' }).click();
    await expect(
      page.getByRole('heading', { name: code, exact: true })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Add characterization' }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Technique').fill('EDX');
    await form.getByRole('button', { name: 'Add characterization' }).click();
    await expect(form).toBeHidden();

    await main.getByRole('link', { name: 'EDX', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'EDX', level: 1 })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Attach files to EDX' }).click();
    await page.getByRole('button', { name: 'A folder' }).click();
    await page
      .getByLabel('Folder to attach')
      .setInputFiles(writeSample(samples, code));
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(`${code} · 3 files`)).toBeVisible();

    await page
      .getByRole('navigation', { name: 'breadcrumb' })
      .getByRole('link', { name: 'Deposition', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Deposition', exact: true, level: 1 })
    ).toBeVisible();
  }

  // The workspace: choose the project and the experiment.
  await page
    .locator('[data-slot="sidebar-container"]')
    .getByRole('link', { name: 'EDX', exact: true })
    .click();
  await page.getByRole('link', { name: 'From an experiment' }).click();
  await page.getByLabel('Project', { exact: true }).click();
  await page.getByRole('option', { name: projectName, exact: true }).click();
  await page.getByLabel('Experiment', { exact: true }).click();
  await page.getByRole('option', { name: 'Deposition', exact: true }).click();

  // Both samples are listed; ticking shows what each would do to B/N.
  await page.getByRole('checkbox', { name: 'Select ABC001' }).click();
  await page.getByRole('checkbox', { name: 'Select ABC002' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Update ABC001' })
  ).toBeChecked();
  // It would replace the 9, so it starts as skipped, and says so.
  await expect(
    page.getByRole('checkbox', { name: 'Update ABC002' })
  ).not.toBeChecked();
  await expect(page.getByText('9 → 1.66667')).toBeVisible();

  await page.getByRole('button', { name: 'Apply to 1 sample' }).click();
  await expect(page.getByText('1 sample updated')).toBeVisible();

  // ABC001 got its value; ABC002 kept the 9.
  await page.goto(page.url().replace(/characterization.*/, ''));
  await page
    .locator('[data-slot="sidebar-container"]')
    .getByRole('link', { name: projectName, exact: true })
    .click();
  await page
    .getByRole('main')
    .getByRole('link', { name: /Deposition/ })
    .click();
  const table = page.getByRole('table').first();
  await expect(table.getByRole('row', { name: /ABC001/ })).toContainText(
    '1.6666'
  );
  await expect(table.getByRole('row', { name: /ABC002/ })).toContainText('9');
  await expect(table.getByRole('row', { name: /ABC002/ })).not.toContainText(
    '1.6666'
  );
});
