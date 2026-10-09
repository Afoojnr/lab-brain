import { expect, test } from '@playwright/test';

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

  // Cycles (what you set) and Thickness (what you measure).
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
  await expect(
    page.getByRole('button', { name: 'Delete Thickness' })
  ).toBeDisabled();

  // Deleting the calculated column removes only its formula.
  await page.getByRole('button', { name: 'Delete GPC' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    table.getByRole('columnheader', { name: /calculated:\s*GPC/i })
  ).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Delete Thickness' })
  ).toBeDisabled();
});
