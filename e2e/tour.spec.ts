import { expect, test } from '@playwright/test';

// The guided tour, end to end. The other specs run with tours off (see
// playwright.config.ts); this one starts from a visitor who has seen nothing.
test.use({ storageState: { cookies: [], origins: [] } });

test('offers a tour once, runs it, and can be replayed from the help button', async ({
  page
}) => {
  await page.goto('/');

  // Asked first: nothing opens by itself.
  await expect(page.getByText('New here?')).toBeVisible();
  await expect(page.locator('.driver-popover')).toHaveCount(0);

  await page.getByRole('button', { name: 'Start the tour' }).click();
  const popover = page.locator('.driver-popover');
  await expect(popover).toBeVisible();
  await expect(popover.getByText('1 of')).toBeVisible();

  await popover.getByRole('button', { name: 'Next' }).click();
  await expect(popover.getByText('2 of')).toBeVisible();

  // Leaving it counts as seen: no card after a reload.
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByText('New here?')).toHaveCount(0);

  // The ? in the top bar replays it.
  await page.getByRole('button', { name: 'Tour of this page' }).click();
  await expect(page.locator('.driver-popover')).toBeVisible();
});

test('No more tours silences the cards on every page, and ? still replays one', async ({
  page
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'No more tours' }).click();
  await expect(page.getByText('New here?')).toHaveCount(0);

  await page.goto('/projects/demo-project-1');
  await expect(page.getByText('New here?')).toHaveCount(0);

  await page.getByRole('button', { name: 'Tour of this page' }).click();
  await expect(page.locator('.driver-popover')).toBeVisible();
});
