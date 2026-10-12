import { expect, test } from '@playwright/test';

import { openTab } from './helpers';

// Creates its own project, so the demo data stays untouched.
test('writes a protocol with the formatting buttons and reads it formatted', async ({
  page
}) => {
  const projectName = `Protocol Project ${Date.now().toString().slice(-6)}`;

  await page.goto('/');
  await page
    .getByRole('main')
    .getByRole('button', { name: 'New project' })
    .click();
  await page.getByLabel('Name', { exact: true }).fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByRole('main').getByText(projectName, { exact: true }).click();
  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Deposition');
  await page.getByLabel('Code prefix').fill('abc');
  await page.getByRole('button', { name: 'Create experiment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Deposition', exact: true })
  ).toBeVisible();

  // No protocol yet: the Protocol tab says so.
  await openTab(page, 'Protocol');
  const panel = page.locator('#protocol');
  await expect(panel.getByText('No protocol yet.')).toBeVisible();

  // A click before the page has hydrated can be lost, so try again until the dialog opens.
  await expect(async () => {
    await panel.getByRole('button', { name: 'Add a protocol' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 4000 });
  }).toPass();
  const dialog = page.getByRole('dialog');
  const box = dialog.getByRole('textbox', { name: 'Base protocol' });
  const select = (text: string) =>
    box.evaluate((element: HTMLTextAreaElement, word: string) => {
      const start = element.value.indexOf(word);
      element.setSelectionRange(start, start + word.length);
    }, text);

  // Type plain lines, then format them with the buttons: H1, H2, H3, a list and a table.
  await box.fill('Atomic layer deposition\n\nSubstrate\n\nClean\n\nRinse\nDry');
  await select('Atomic layer deposition');
  await dialog.getByRole('button', { name: 'Heading 1' }).click();
  await select('Substrate');
  await dialog.getByRole('button', { name: 'Heading 2' }).click();
  await select('Clean');
  await dialog.getByRole('button', { name: 'Heading 3' }).click();
  await select('Rinse\nDry');
  await dialog.getByRole('button', { name: 'Bullet list' }).click();
  await box.evaluate((element: HTMLTextAreaElement) =>
    element.setSelectionRange(element.value.length, element.value.length)
  );
  await dialog.getByRole('button', { name: 'Table' }).click();

  await expect(box).toHaveValue(/^# Atomic layer deposition/);
  await expect(box).toHaveValue(/\n## Substrate/);
  await expect(box).toHaveValue(/\n### Clean/);
  await expect(box).toHaveValue(/- Rinse\n- Dry/);
  await expect(box).toHaveValue(/\| Parameter \| Value \|/);

  // Preview shows it formatted before saving.
  await dialog.getByRole('button', { name: 'Preview' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Atomic layer deposition', level: 2 })
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toBeHidden();

  // The panel shows three heading levels, a list and a table.
  await expect(
    panel.getByRole('heading', { name: 'Atomic layer deposition', level: 2 })
  ).toBeVisible();
  await expect(
    panel.getByRole('heading', { name: 'Substrate', level: 3 })
  ).toBeVisible();
  await expect(
    panel.getByRole('heading', { name: 'Clean', level: 4 })
  ).toBeVisible();
  await expect(panel.getByRole('listitem').first()).toHaveText('Rinse');
  await expect(
    panel.getByRole('columnheader', { name: 'Parameter' })
  ).toBeVisible();

  // The tab is in the URL, so it survives a reload.
  await expect(page).toHaveURL(/tab=protocol/);
  await page.reload();
  await expect(
    page
      .locator('#protocol')
      .getByRole('heading', { name: 'Substrate', level: 3 })
  ).toBeVisible();

  // And the experiment summary shows it too.
  await page.getByRole('link', { name: 'Summary', exact: true }).click();
  await expect(page).toHaveURL(/\/report\//);
  await expect(
    page.getByRole('columnheader', { name: 'Parameter' })
  ).toBeVisible();
});

test('shows the demo protocol in full on the Protocol tab', async ({
  page
}) => {
  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1?tab=protocol'
  );

  await expect(
    page.locator('#protocol').getByText(/Example, not a real protocol/)
  ).toBeVisible();
  // Only this tab's content is on the page: the samples table is not.
  await expect(page.getByRole('table')).toHaveCount(0);
});
