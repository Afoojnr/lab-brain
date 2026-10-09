import { expect, test } from '@playwright/test';

// Creates its own project. Results are measured afterwards, so they are typed
// by hand, grouped apart from the parameters, and never copied to a duplicate.
test('records a measured result in its own column and leaves it empty on a duplicate', async ({
  page
}) => {
  const projectName = `Results Project ${Date.now().toString().slice(-6)}`;

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

  // A parameter you set, then a result you measure (no default for a result).
  await page.getByRole('button', { name: 'Add column' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill('Pulse');
  await dialog.getByLabel('Unit').fill('s');
  await dialog.getByLabel('Default value').fill('10');
  await dialog.getByRole('button', { name: 'Add column' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Add column' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill('Thickness');
  await dialog.getByLabel('Unit').fill('nm');
  await dialog.getByLabel('Category').click();
  await page.getByRole('option', { name: 'Result' }).click();
  await expect(dialog.getByLabel('Default value')).toBeHidden();
  await dialog.getByRole('button', { name: 'Add column' }).click();
  await expect(dialog).toBeHidden();

  // The sample form has a Results section, empty even though Pulse is prefilled.
  await page.getByRole('link', { name: 'Add sample' }).click();
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await expect(page.getByLabel('Pulse (s)', { exact: true })).toHaveValue('10');
  await expect(page.getByLabel('Thickness (nm)', { exact: true })).toHaveValue(
    ''
  );

  // Text in a result column is an error on that exact field, never zero.
  await page.getByLabel('Thickness (nm)', { exact: true }).fill('thin');
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(
    page.getByText('Enter a number, for example 1.5.')
  ).toBeVisible();
  await expect(
    page.getByLabel('Thickness (nm)', { exact: true })
  ).toBeFocused();
  await page.getByLabel('Thickness (nm)', { exact: true }).fill('41,2');
  await page.getByRole('button', { name: 'Save sample' }).click();

  // The sample page lists the result in its own panel.
  await expect(
    page.getByRole('heading', { name: 'ABC001', exact: true })
  ).toBeVisible();
  await expect(page.getByText('Results', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '41.2 nm' })).toBeVisible();

  // A duplicate keeps the parameter and leaves the result empty.
  await page.getByRole('link', { name: 'Duplicate' }).click();
  await expect(page.getByLabel('Pulse (s)', { exact: true })).toHaveValue('10');
  await expect(page.getByLabel('Thickness (nm)', { exact: true })).toHaveValue(
    ''
  );
});
