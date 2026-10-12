import { expect, test } from '@playwright/test';

import { openTab } from './helpers';

// A calculated column end to end: GPC (Å/cycle) from the thickness (nm) and the
// number of cycles. Creates its own project, so it never depends on what
// another test, or an earlier run, left behind.
test('adds a GPC column that follows the thickness and stays empty when an input is missing', async ({
  page
}) => {
  const projectName = `Derived Project ${Date.now().toString().slice(-6)}`;

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
  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Deposition');
  await page.getByLabel('Code prefix').fill('abc');
  await page.getByRole('button', { name: 'Create experiment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Deposition', exact: true })
  ).toBeVisible();

  // Cycles (what you set) and Thickness (what you measure), in the Setup tab.
  await openTab(page, 'Setup');
  await page.getByRole('button', { name: 'Add column' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill('Cycles');
  await dialog.getByRole('button', { name: 'Add column' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Add column' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill('Thickness');
  await dialog.getByLabel('Unit').fill('nm');
  await dialog.getByLabel('Category').click();
  await page.getByRole('option', { name: 'Result' }).click();
  await dialog.getByRole('button', { name: 'Add column' }).click();
  await expect(dialog).toBeHidden();

  // Two samples: one with both values, one without a thickness yet.
  const addSample = async (cycles: string, thickness: string) => {
    await page.getByRole('link', { name: 'Add sample' }).click();
    await page.getByLabel('Cycles', { exact: true }).fill(cycles);
    if (thickness) {
      await page.getByLabel('Thickness (nm)', { exact: true }).fill(thickness);
    }
    await page.getByRole('button', { name: 'Save sample' }).click();
    await expect(page.getByRole('heading', { name: /^ABC\d+$/ })).toBeVisible();
    await page
      .getByRole('link', { name: 'Deposition', exact: true })
      .first()
      .click();
    // Wait for the experiment page before the next step: the sample page has no table.
    await expect(
      page.getByRole('heading', { name: 'Deposition', exact: true, level: 1 })
    ).toBeVisible();
  };
  await addSample('50', '40,5');
  await addSample('100', '');

  // The formula is checked as it is typed: an unknown column is named.
  await openTab(page, 'Setup');
  await page.getByRole('button', { name: 'Add calculated column' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill('GPC');
  await dialog.getByLabel('Unit').fill('Å/cycle');
  await dialog.getByLabel('Formula').fill('[Thicknes] * 10 / [Cycles]');
  await dialog.getByRole('button', { name: 'Add column' }).click();
  await expect(
    dialog.getByText('There is no column called Thicknes.')
  ).toBeVisible();

  // The preview shows the result on the first samples before saving.
  await dialog.getByLabel('Formula').fill('');
  await dialog.getByRole('button', { name: 'Thickness' }).click();
  await dialog.getByLabel('Formula').pressSequentially(' * 10 / ');
  await dialog.getByRole('button', { name: 'Cycles' }).click();
  await expect(dialog.getByLabel('Formula')).toHaveValue(
    '[Thickness] * 10 / [Cycles]'
  );
  await expect(dialog.getByText('ABC001 → 8.1 Å/cycle')).toBeVisible();
  await expect(dialog.getByText(/ABC002 →/)).toContainText('not recorded');
  await dialog.getByRole('button', { name: 'Add column' }).click();
  await expect(dialog).toBeHidden();

  // The table shows it after the entered columns: 8.1 for ABC001, empty for ABC002.
  await openTab(page, 'Samples');
  const table = page.getByRole('table').first();
  await expect(
    table.getByRole('columnheader', { name: /calculated:\s*GPC/i })
  ).toBeVisible();
  await expect(table.getByRole('row', { name: /ABC001/ })).toContainText('8.1');
  await expect(table.getByRole('row', { name: /ABC002/ })).not.toContainText(
    '8.1'
  );

  // The sample page lists it as calculated.
  await table.getByRole('link', { name: 'ABC001', exact: true }).click();
  await expect(page.getByRole('cell', { name: '8.1 Å/cycle' })).toBeVisible();
  await page
    .getByRole('link', { name: 'Deposition', exact: true })
    .first()
    .click();

  // A column the formula uses cannot be deleted from under it.
  await openTab(page, 'Setup');
  await expect(
    page.getByRole('button', { name: 'Delete Thickness' })
  ).toBeDisabled();

  // A calculated column can be built on another one: GPC in nm instead of Å.
  await page.getByRole('button', { name: 'Add calculated column' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill('GPC nm');
  await dialog.getByLabel('Unit').fill('nm/cycle');
  // The calculated columns are offered in their own group.
  await dialog
    .getByRole('group', { name: 'Calculated columns' })
    .getByRole('button', { name: 'GPC' })
    .click();
  await dialog.getByLabel('Formula').pressSequentially(' / 10');
  await expect(dialog.getByText('ABC001 → 0.81 nm/cycle')).toBeVisible();
  await dialog.getByRole('button', { name: 'Add column' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('cell', { name: '[GPC] / 10', exact: true })
  ).toBeVisible();

  // GPC is used by that formula now, so it cannot be deleted from under it.
  await expect(
    page.getByRole('button', { name: 'Delete GPC', exact: true })
  ).toBeDisabled();

  // Hovering the greyed-out button says why, and what to do first.
  await page
    .getByRole('button', { name: 'Delete GPC', exact: true })
    .locator('xpath=..')
    .hover();
  await expect(
    page.locator('[data-slot="tooltip-content"]').last()
  ).toContainText('GPC nm uses this column. Change or delete it first');
  // The same for an entered column that a formula uses.
  await page
    .getByRole('button', { name: 'Delete Thickness', exact: true })
    .locator('xpath=..')
    .hover();
  await expect(
    page.locator('[data-slot="tooltip-content"]').last()
  ).toContainText('cannot be deleted while samples hold values');

  // The table shows the chained value after GPC.
  await openTab(page, 'Samples');
  await expect(
    page.getByRole('columnheader', { name: /calculated:\s*GPC nm/i })
  ).toBeVisible();
  await expect(page.getByRole('row', { name: /ABC001/ })).toContainText('0.81');
  await openTab(page, 'Setup');

  // A formula cannot loop: GPC cannot be built on GPC nm, which is built on it.
  await page.getByRole('button', { name: 'Edit GPC', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Formula').fill('[GPC nm] * 10');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    dialog.getByText(
      'This formula would loop back to itself: GPC nm uses this column.'
    )
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  // Delete the chained column first; then GPC is free to delete.
  await page
    .getByRole('button', { name: 'Delete GPC nm', exact: true })
    .click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Delete GPC nm', exact: true })
  ).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Delete GPC', exact: true })
  ).toBeEnabled();

  // Deleting the calculated column removes only its formula.
  await page.getByRole('button', { name: 'Delete GPC' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete GPC' })).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Delete Thickness' })
  ).toBeDisabled();
  await openTab(page, 'Samples');
  await expect(
    page.getByRole('columnheader', { name: /calculated:\s*GPC/i })
  ).toBeHidden();
});
