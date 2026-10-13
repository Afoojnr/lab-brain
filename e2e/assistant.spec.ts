import { expect, test } from '@playwright/test';

// The server runs with LAB_BRAIN_MOCK_AI (see playwright.config.ts): the
// "AI" is a built-in stand-in, so no real key or network is involved.
test('writes a background and a reference, summarises it, then asks the assistant', async ({
  page
}) => {
  const projectName = `Assist ${Date.now().toString().slice(-6)}`;

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
  const projectUrl = page.url();

  // Background tab: written once, shown formatted.
  const tabs = page.getByRole('navigation', { name: 'Project sections' });
  await tabs.getByRole('link', { name: /^Background/ }).click();
  await page.getByRole('button', { name: 'Add background' }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Background', { exact: true })
    .fill('Goal: **thin** films');
  await dialog.getByRole('button', { name: 'Save background' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('strong', { hasText: 'thin' })).toBeVisible();

  // References tab: a pasted text is read once and listed.
  await tabs.getByRole('link', { name: /^References/ }).click();
  await page.getByRole('button', { name: 'Add a reference' }).first().click();
  await dialog.getByRole('button', { name: 'Pasted text' }).click();
  await dialog.getByLabel('Title').fill('Pulse paper');
  await dialog
    .getByLabel('Text', { exact: true })
    .fill('The plasma pulse changes the growth per cycle of films. '.repeat(4));
  await dialog.getByRole('button', { name: 'Add reference' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Pulse paper' })
  ).toBeVisible();

  // Without a key, Summarise waits.
  const summarise = page.getByRole('button', {
    name: 'Summarise',
    exact: true
  });
  await expect(summarise).toBeDisabled();

  // Settings: choose a key (kept in this browser only).
  await page.goto('/settings');
  await page.getByLabel('API key').fill('sk-e2e-not-a-real-key');

  await page.goto(`${projectUrl}?tab=references`);
  await expect(summarise).toBeEnabled();
  await summarise.click();
  await expect(page.getByText('Mock summary of the document.')).toBeVisible();

  // Ask AI on the project page opens the assistant panel beside the page.
  await page.goto(projectUrl);
  await page.getByRole('button', { name: 'Ask AI' }).click();
  const panel = page.getByRole('complementary', { name: 'Assistant' });
  await expect(panel).toBeVisible();
  await panel
    .getByRole('textbox', { name: 'Ask about this project…' })
    .fill('What is in this project?');
  // Enter sends (the dev-tools badge can sit over the Send button in development).
  await page.keyboard.press('Enter');
  await expect(
    panel.getByText(/Mock answer from your experiments/)
  ).toBeVisible();
  await expect(panel.getByText(/tokens used/)).toBeVisible();
});

test('answers about an experiment with the records it names, and keeps the chat while you move around', async ({
  page
}) => {
  await page.goto('/settings');
  await page.getByLabel('API key').fill('sk-e2e-not-a-real-key');

  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');
  await page.getByRole('button', { name: 'Ask AI' }).click();
  const panel = page.getByRole('complementary', { name: 'Assistant' });
  await expect(
    panel.getByRole('button', { name: 'This experiment' })
  ).toHaveAttribute('aria-pressed', 'true');
  await panel
    .getByRole('textbox', { name: 'Ask about this project…' })
    .fill('Which experiments are there?');
  // Enter sends (the dev-tools badge can sit over the Send button in development).
  await page.keyboard.press('Enter');

  await expect(
    panel.getByText(/Mock answer from your experiments/)
  ).toBeVisible();
  // Only the record the answer names is a source (not every row a lookup returned).
  const sources = panel.getByRole('link', { name: 'Deposition', exact: true });
  await expect(sources).toHaveAttribute(
    'href',
    '/projects/demo-project-1/experiments/demo-experiment-1'
  );
  await expect(panel.getByRole('link', { name: 'Paschen law' })).toHaveCount(0);

  // Moving to the project page keeps the open panel and its conversation.
  await page
    .getByRole('navigation', { name: 'breadcrumb' })
    .getByRole('link', { name: 'ALD of BxC' })
    .click();
  await expect(page).toHaveURL(/\/projects\/demo-project-1$/);
  await expect(
    panel.getByText(/Mock answer from your experiments/)
  ).toBeVisible();
  await expect(
    panel.getByRole('button', { name: 'This experiment' })
  ).toHaveCount(0);

  await panel.getByRole('button', { name: 'Close the assistant' }).click();
  await expect(panel).toBeHidden();
});

test('asks for a key before any question when none is set', async ({
  page
}) => {
  await page.goto('/projects/demo-project-1');
  await page.getByRole('button', { name: 'Ask AI' }).click();
  const panel = page.getByRole('complementary', { name: 'Assistant' });

  await expect(panel.getByText(/Add your AI key/)).toBeVisible();
  await expect(
    panel.getByRole('link', { name: 'Open settings' })
  ).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Send' })).toBeDisabled();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('the panel fills the screen and can be closed', async ({ page }) => {
    await page.goto('/projects/demo-project-1');
    await page.getByRole('button', { name: 'Ask AI' }).click();
    const panel = page.getByRole('complementary', { name: 'Assistant' });

    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(388);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);

    await panel.getByRole('button', { name: 'Close the assistant' }).click();
    await expect(panel).toBeHidden();
  });
});
