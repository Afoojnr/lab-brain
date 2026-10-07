import { expect, test } from '@playwright/test';

// A 1x1 transparent PNG, built here so the test needs no files on disk.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// Files on a characterization end to end. Creates its own project, so it never
// depends on what another test, or an earlier run, left behind. The files are
// FAKE placeholders, only to exercise attaching, serving and removing.
test('attaches files to a characterization, serves them and removes one', async ({
  page
}) => {
  const projectName = `Files Project ${Date.now().toString().slice(-6)}`;

  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Name').fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByText(projectName, { exact: true }).click();
  await expect(
    page.getByRole('heading', { name: projectName, exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name').fill('Deposition');
  await page.getByLabel('Code prefix').fill('abc');
  await page.getByRole('button', { name: 'Create experiment' }).click();
  await page.getByRole('link', { name: 'Add sample' }).click();
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(
    page.getByRole('heading', { name: 'ABC001', exact: true })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Add characterization' }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Technique').fill('SEM');
  await form.getByLabel('Date measured').fill('2026-09-15');
  await form.getByRole('button', { name: 'Add characterization' }).click();
  await expect(form).toBeHidden();

  // Attach an image and a text file at once.
  await page.getByRole('button', { name: 'Attach files to SEM' }).click();
  await page.getByLabel('Files to attach').setInputFiles([
    { name: 'pixel.png', mimeType: 'image/png', buffer: PIXEL },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('fake') }
  ]);
  await expect(page.getByRole('dialog')).toBeHidden();

  const image = page.getByRole('img', { name: 'pixel.png' });
  await expect(image).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Download notes.txt' })
  ).toBeVisible();
  // Stored under project/experiment/sample/technique, date in the file name.
  await expect(
    page.getByText(`${projectName}/ABC/ABC001/SEM/2026-09-15_pixel.png`)
  ).toBeVisible();

  // The image is served inline; the text file as a download.
  const imageUrl = await image.getAttribute('src');
  const imageResponse = await page.request.get(imageUrl ?? '');
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()['content-type']).toBe('image/png');
  const textHref = await page
    .getByRole('link', { name: 'Download notes.txt' })
    .getAttribute('href');
  const textResponse = await page.request.get(textHref ?? '');
  expect(textResponse.headers()['content-disposition']).toMatch(/^attachment/);

  // The same name again never replaces the first file.
  await page.getByRole('button', { name: 'Attach files to SEM' }).click();
  await page.getByLabel('Files to attach').setInputFiles([
    {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('second')
    }
  ]);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(/2026-09-15_notes-2\.txt/)).toBeVisible();

  // Remove the image after confirming: the record and the file are gone.
  await page.getByRole('button', { name: 'Remove pixel.png' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  // Wait for the dialog to close first: while it is open the page behind it is
  // hidden from the accessibility tree, so the image would look gone already.
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(image).toBeHidden();
  expect((await page.request.get(imageUrl ?? '')).status()).toBe(404);

  // Deleting the characterization removes its remaining files too.
  const textUrl = textHref ?? '';
  await page.getByRole('button', { name: 'Delete SEM' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('No characterizations yet.')).toBeVisible();
  expect((await page.request.get(textUrl)).status()).toBe(404);
});

test('shows the demo image checked into the repo', async ({ page }) => {
  await page.goto(
    '/projects/demo-project-1/experiments/demo-experiment-1/samples/demo-sample-1'
  );

  const image = page.getByRole('img', {
    name: 'example-image-not-a-measurement.png'
  });
  await expect(image).toBeVisible();
  const response = await page.request.get(
    (await image.getAttribute('src')) ?? ''
  );
  expect(response.status()).toBe(200);
});
