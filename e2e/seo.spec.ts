import { expect, test } from '@playwright/test';

// Branding and search-engine basics: the tags in the page head, the icon
// files, the web app manifest, and robots.txt keeping crawlers out.
test('the home page carries its preview tags, icons and a noindex', async ({
  page
}) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Lab Brain/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /experiments/
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Lab Brain'
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /^https?:\/\/.+\/opengraph-image/
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image'
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('link[rel="icon"]').first()).toBeAttached();
});

test('serves the preview card, the manifest and robots.txt', async ({
  request
}) => {
  const card = await request.get('/opengraph-image');
  expect(card.status()).toBe(200);
  expect(card.headers()['content-type']).toContain('image/png');

  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).name).toBe('Lab Brain');

  const icon = await request.get('/icons/icon-512.png');
  expect(icon.status()).toBe(200);

  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /');
});
