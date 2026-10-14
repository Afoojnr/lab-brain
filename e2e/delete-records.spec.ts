import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { chooseFromMenu, openTab } from './helpers';

// Deleting, end to end: a whole uploaded folder in one click, then a study
// (its samples stay), a sample, an experiment and a project, each asking first.
// Creates its own project; every file is FAKE.
const makeFolder = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'lab-brain-delete-'));
  const folder = path.join(root, 'FAKEDIR');
  mkdirSync(folder, { recursive: true });
  for (const name of ['one.txt', 'two.txt', 'three.txt']) {
    writeFileSync(path.join(folder, name), `fake ${name}`);
  }

  return folder;
};

test('deletes a folder in one click, then a study, a sample, an experiment and a project, each after asking', async ({
  page
}) => {
  // A long flow.
  test.setTimeout(150_000);
  const projectName = `Delete Me ${Date.now().toString().slice(-6)}`;

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

  // Two samples.
  for (const code of ['ABC001', 'ABC002']) {
    await page.getByRole('link', { name: 'Add sample' }).click();
    await page.getByRole('button', { name: 'Save sample' }).click();
    await expect(
      page.getByRole('heading', { name: code, exact: true })
    ).toBeVisible();
    if (code === 'ABC001') {
      // A measurement with an uploaded folder of three files.
      await page.getByRole('button', { name: 'Add characterization' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Technique').fill('Notes');
      await dialog.getByLabel('Date measured').fill('2026-09-14');
      await dialog
        .getByRole('button', { name: 'Add characterization' })
        .click();
      await expect(dialog).toBeHidden();
      await page
        .getByRole('main')
        .getByRole('link', { name: 'Notes', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Notes', level: 1 })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Attach files to Notes' }).click();
      await page.getByRole('button', { name: 'A folder' }).click();
      await page.getByLabel('Folder to attach').setInputFiles(makeFolder());
      await expect(page.getByRole('dialog')).toBeHidden({ timeout: 20_000 });
      await expect(page.getByText('FAKEDIR · 3 files')).toBeVisible();

      // The whole folder in one click and one confirmation.
      await page.getByRole('button', { name: 'Delete folder FAKEDIR' }).click();
      await expect(
        page.getByText('Delete FAKEDIR and its 3 files?')
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Delete folder', exact: true })
        .click();
      await expect(page.getByText('FAKEDIR · 3 files')).toBeHidden();
      await expect(page.getByText('FAKEDIR deleted (3 files)')).toBeVisible();
      await page
        .getByRole('navigation', { name: 'breadcrumb' })
        .getByRole('link', { name: 'ABC001', exact: true })
        .click();
    }
    await page
      .getByRole('navigation', { name: 'breadcrumb' })
      .getByRole('link', { name: 'Deposition', exact: true })
      .click();
  }

  // A study with both samples tagged: deleting it keeps the samples.
  await openTab(page, 'Setup');
  await page.getByRole('button', { name: 'New study' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Throwaway study');
  await page.getByRole('button', { name: 'Create study' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await openTab(page, 'Samples');
  await page.getByRole('checkbox', { name: 'Select ABC001' }).click();
  await page.getByRole('checkbox', { name: 'Select ABC002' }).click();
  await page.getByRole('button', { name: 'Assign to Throwaway study' }).click();
  await expect(page.getByText('2 samples selected')).toBeHidden();

  await openTab(page, 'Setup');
  // The bin next to the study opens a confirmation.
  await page.getByRole('button', { name: 'Delete Throwaway study' }).click();
  await expect(
    page.getByRole('heading', { name: 'Delete this study?' })
  ).toBeVisible();
  await expect(
    page.getByText('2 samples keep all their data and only lose the tag.')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete study', exact: true }).click();
  await expect(page.getByText('Study deleted')).toBeVisible();
  await openTab(page, 'Samples');
  const table = page.getByRole('table').first();
  await expect(
    table.getByRole('link', { name: 'ABC001', exact: true })
  ).toBeVisible();
  await expect(
    table.getByRole('link', { name: 'ABC002', exact: true })
  ).toBeVisible();

  // A sample: asks first, lists what goes with it, and lands on the experiment.
  await table.getByRole('link', { name: 'ABC001', exact: true }).click();
  await chooseFromMenu(page, 'Delete sample');
  await expect(page.getByText('1 measurement')).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete sample', exact: true })
    .click();
  await expect(page.getByText('Sample deleted')).toBeVisible();
  await expect(page).toHaveURL(/\/experiments\/[^/]+$/);
  await expect(
    page
      .getByRole('table')
      .first()
      .getByRole('link', { name: 'ABC001', exact: true })
  ).toHaveCount(0);
  await expect(
    page
      .getByRole('table')
      .first()
      .getByRole('link', { name: 'ABC002', exact: true })
  ).toBeVisible();

  // An experiment: its exact name must be typed.
  await chooseFromMenu(page, 'Delete experiment');
  const confirm = page.getByRole('button', {
    name: 'Delete experiment',
    exact: true
  });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Name', { exact: true }).last().fill('deposition');
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Name', { exact: true }).last().fill('Deposition');
  await confirm.click();
  await expect(page.getByText('Experiment deleted')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: projectName, exact: true })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Deposition/ })).toHaveCount(0);

  // The project: its exact name, then it is gone from the sidebar.
  await chooseFromMenu(page, 'Delete project');
  const confirmProject = page.getByRole('button', {
    name: 'Delete project',
    exact: true
  });
  await expect(confirmProject).toBeDisabled();
  await page.getByLabel('Name', { exact: true }).last().fill(projectName);
  await confirmProject.click();
  await expect(page.getByText('Project deleted')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('navigation').getByRole('link', { name: projectName })
  ).toHaveCount(0);
});
