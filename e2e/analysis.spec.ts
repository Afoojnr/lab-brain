import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import sharp from 'sharp';

// EDX and ellipsometry end to end. Creates its own project. Every file is FAKE:
// built here with invented numbers in the layout the instruments export, only
// to exercise folder upload, the spot selection, the averages and sending
// values to the result columns.
const QUANTIFICATION = (b: number, n: number) =>
  `Atomic number,Element symbol,Element name,Atomic concentration percentage,Weight concentration percentage,Energy level\n5,B,Boron,${b},0.1,10000\n7,N,Nitrogen,${n},0.1,10000\n`;

const EMSA = `#FORMAT      : EMSA/MAS Spectral Data File
#NPOINTS     : 4.
#XPERCHAN    : 10.0
#OFFSET      : 0.0
#SPECTRUM    : Spectral Data Starts Here
1.0,
5.0,
9.0,
2.0,
`;

const SEQFIT = `Phase No.,Phase Desc,SubLay No.,Site No.,X,Y,Z,d(nm),d 2s(nm),n,k,R2,RMSE,Date&Time,Measurement
1,Dispersionlaws,0,,0,0,9.0,10.0,0.5,1.5,0,0.8,2.4,'2026/01/01 10:00:00',FAKE001_pt1
1,Dispersionlaws,0,,0,0,9.0,12.0,0.5,1.7,0,0.8,2.4,'2026/01/01 10:01:00',FAKE001_pt2
,,,,,,,,,,,,,,
,,,,,,,d(nm),d 2s(nm),n,k,,,,
Average,,,,,,,11.0,0.6,1.6,0,,,,
StdDeviation,,,,,,,1.0,0.07,0.1,0,,,,
`;

const makeEdxFolder = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'lab-brain-edx-'));
  const folder = path.join(root, 'FAKE001');
  // Spots B 50 / 40 / 60 %, N 30 % each: the average B/N is 50/30.
  for (const [index, b] of [0.5, 0.4, 0.6].entries()) {
    const spot = path.join(folder, 'export', `spot_${index + 1}`);
    mkdirSync(spot, { recursive: true });
    writeFileSync(
      path.join(spot, 'quantification.csv'),
      QUANTIFICATION(b, 0.3)
    );
    writeFileSync(path.join(spot, 'spectrum.emsa'), EMSA);
  }
  writeFileSync(path.join(folder, '.DS_Store'), 'junk');

  return folder;
};

test('analyses an EDX folder and an ellipsometry fit and fills the result columns', async ({
  page
}) => {
  // A long flow: folder upload, two analyses, two uploads, and the viewer.
  test.setTimeout(90_000);
  const projectName = `Analysis Project ${Date.now().toString().slice(-6)}`;

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
  await page.getByRole('link', { name: 'Add sample' }).click();
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(
    page.getByRole('heading', { name: 'ABC001', exact: true })
  ).toBeVisible();

  const addCharacterization = async (technique: string, date: string) => {
    await page.getByRole('button', { name: 'Add characterization' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Technique').fill(technique);
    await dialog.getByLabel('Date measured').fill(date);
    await dialog.getByRole('button', { name: 'Add characterization' }).click();
    await expect(dialog).toBeHidden();
  };
  await addCharacterization('EDX', '2026-09-14');
  await addCharacterization('Ellipsometry', '2026-09-15');

  // EDX: attach the whole folder, with its subfolders.
  // The technique in the page, not the sidebar's link to the EDX workspace.
  await page
    .getByRole('main')
    .getByRole('link', { name: 'EDX', exact: true })
    .click();
  // Wait for the characterization page: the sample page has a paperclip too.
  await expect(
    page.getByRole('heading', { name: 'EDX', level: 1 })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Attach files to EDX' }).click();
  await page.getByRole('button', { name: 'A folder' }).click();
  await page.getByLabel('Folder to attach').setInputFiles(makeEdxFolder());
  // Six files go one by one, so allow for that.
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 20_000 });
  // 3 × (quantification + spectrum); the hidden .DS_Store is left out.
  await expect(page.getByText('FAKE001 · 6 files')).toBeVisible();

  // The averages over the three spots, B over N.
  await expect(page.getByText('3 of 3 spots in the averages')).toBeVisible();
  await expect(page.getByText('B/N 1.66667')).toBeVisible();

  // Leave a spot out: nothing is deleted, the average moves to (50+60)/2 over 30.
  await page.getByRole('checkbox', { name: 'Include spot_2' }).click();
  await expect(page.getByText('2 of 3 spots in the averages')).toBeVisible();
  await expect(page.getByText('B/N 1.83333')).toBeVisible();

  // Switch the ratio to N over B.
  await page.getByLabel('Element on top').click();
  await page.getByRole('option', { name: 'N', exact: true }).click();
  await page.getByLabel('Element below').click();
  await page.getByRole('option', { name: 'B', exact: true }).click();
  await expect(page.getByText('N/B 0.545455')).toBeVisible();
  // ... and back to B over N.
  await page.getByLabel('Element on top').click();
  await page.getByRole('option', { name: 'B', exact: true }).click();
  await page.getByLabel('Element below').click();
  await page.getByRole('option', { name: 'N', exact: true }).click();

  // Send the defaults (ratio, B, N, C, O, substrate, each with std) to new result columns.
  await page.getByRole('button', { name: 'Send 12 values to results' }).click();
  await expect(page.getByText('12 values sent to the results')).toBeVisible();

  await page
    .getByRole('navigation', { name: 'breadcrumb' })
    .getByRole('link', { name: 'Deposition', exact: true })
    .click();
  const table = page.getByRole('table').first();
  await expect(
    table.getByRole('columnheader', { name: 'B/N', exact: true })
  ).toBeVisible();
  await expect(
    table.getByRole('columnheader', { name: 'B std' })
  ).toBeVisible();
  await expect(table).toContainText('1.8333');

  // Ellipsometry: attach the fit export, read its summary rows.
  await page.getByRole('link', { name: 'ABC001', exact: true }).click();
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Ellipsometry', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Ellipsometry', level: 1 })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Attach files to Ellipsometry' })
    .click();
  await page.getByLabel('Files to attach').setInputFiles([
    {
      name: 'FAKE001_seqfit.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(SEQFIT)
    },
    {
      name: 'Image 1.tiff',
      mimeType: 'image/tiff',
      buffer: await sharp({
        create: { width: 30, height: 20, channels: 3, background: '#336699' }
      })
        .tiff()
        .toBuffer()
    }
  ]);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('11 ± 1 nm')).toBeVisible();
  await expect(page.getByText('1.6 ± 0.1')).toBeVisible();

  // The CSV opens in the page as a table instead of downloading.
  await page.getByRole('button', { name: 'Open FAKE001_seqfit.csv' }).click();
  await expect(
    page.getByRole('dialog').getByRole('cell', { name: 'FAKE001_pt1' })
  ).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  // A TIFF is shown through a PNG copy; its original stays a download.
  const thumbnail = page.getByRole('img', { name: 'Image 1.tiff' });
  await expect(thumbnail).toBeVisible();
  const preview = await page.request.get(
    (await thumbnail.getAttribute('src')) ?? ''
  );
  expect(preview.status()).toBe(200);
  expect(preview.headers()['content-type']).toBe('image/png');

  // Thickness and n go to result columns; the EDX ones are offered by name.
  await page.getByRole('button', { name: 'Send 4 values to results' }).click();
  await expect(page.getByText('4 values sent to the results')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'breadcrumb' })
    .getByRole('link', { name: 'Deposition', exact: true })
    .click();
  await expect(
    page
      .getByRole('table')
      .first()
      .getByRole('columnheader', { name: 'Thickness (nm)', exact: true })
  ).toBeVisible();
  // The earlier EDX values are still there.
  await expect(page.getByRole('table').first()).toContainText('1.8333');
});
