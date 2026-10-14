/**
 * Writes the icon files from the one logo component, so they never drift from
 * the mark in the app. Run from the repo root with `npx tsx scripts/brand-assets.tsx` after the
 * logo changes, and commit the results.
 *
 *   app/icon.svg          the favicon (compact mark)
 *   app/favicon.ico       16, 32 and 48 px (compact mark)
 *   app/apple-icon.png    180 px, square corners (the phone rounds it)
 *   public/icons/*.png    192 and 512 px for the web app manifest
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';
import { renderToStaticMarkup } from 'react-dom/server';

import { LogoMark } from '../components/brand/logo-mark';

const root = process.cwd();

const markup = (size: number, variant: 'full' | 'compact', corner: number) =>
  renderToStaticMarkup(
    <LogoMark size={size} variant={variant} corner={corner} />
  );

const png = async (
  size: number,
  variant: 'full' | 'compact',
  corner: number
): Promise<Buffer> => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: size, height: size }
  });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${markup(size, variant, corner)}`
  );
  const image = await page.screenshot({ omitBackground: true, type: 'png' });
  await browser.close();

  return image;
};

/** An .ico holding PNG images, which every current browser reads. */
const ico = (images: { size: number; data: Buffer }[]): Buffer => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;

    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(i => i.data)]);
};

const main = async () => {
  mkdirSync(path.join(root, 'public/icons'), { recursive: true });

  writeFileSync(path.join(root, 'app/icon.svg'), markup(64, 'compact', 14));
  writeFileSync(
    path.join(root, 'app/favicon.ico'),
    ico(
      await Promise.all(
        [16, 32, 48].map(async size => ({
          size,
          data: await png(size, 'compact', 14)
        }))
      )
    )
  );
  writeFileSync(
    path.join(root, 'app/apple-icon.png'),
    await png(180, 'full', 0)
  );
  writeFileSync(
    path.join(root, 'public/icons/icon-192.png'),
    await png(192, 'full', 0)
  );
  writeFileSync(
    path.join(root, 'public/icons/icon-512.png'),
    await png(512, 'full', 0)
  );
};

void main();
