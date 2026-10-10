import { expect, test } from '@playwright/test';

// The plots workspace. The table is FAKE: invented numbers, only to exercise
// the upload, the grouping and the counts. The experiment tests only read the
// demo experiment, so they never change what other tests rely on.
const TABLE = [
  'Power (W),Thickness (nm),Gas,Std (nm)',
  '100,10,N2,1',
  '200,n/a,Ar,1',
  '300,30,N2,2',
  '0,5,Ar,n/a'
].join('\n');

test('plots an uploaded table, counts what is left out and never plots a missing value', async ({
  page
}) => {
  await page.goto('/plots');
  await page.getByLabel('Table file').setInputFiles({
    name: 'fake.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(TABLE)
  });

  // 4 rows: one has no thickness ("n/a"), so it is left out, not plotted as 0.
  const summary = page.getByText(/samples plotted/);
  await expect(summary).toContainText('3 samples plotted');
  await expect(summary).toContainText('1 left out (no value)');
  await expect(page.locator('.recharts-scatter-symbol')).toHaveCount(3);

  // Error bars come from the chosen number column; a point without one has none.
  await expect(page.locator('.recharts-errorBar')).toHaveCount(0);
  await page.getByLabel('Error bars').click();
  await page.getByRole('option', { name: 'Std (nm)' }).click();
  await expect(page.locator('.recharts-errorBar')).toHaveCount(2);

  // Power 0 cannot sit on a logarithmic axis: left out and counted.
  await page.getByRole('checkbox', { name: 'Logarithmic X' }).click();
  await expect(summary).toContainText('2 samples plotted');
  await expect(summary).toContainText('1 left out (0 or less on a log axis)');

  // Back to a linear axis, then colour by the text column: one legend entry per gas.
  await page.getByRole('checkbox', { name: 'Logarithmic X' }).click();
  await page.getByLabel('Colour by', { exact: true }).click();
  await page.getByRole('option', { name: 'Gas' }).click();
  const legend = page.getByRole('list', { name: 'Legend' });
  await expect(legend).toContainText('Ar');
  await expect(legend).toContainText('N2');
});

test('plots an experiment, colours by study and plots only the ticked samples', async ({
  page
}) => {
  await page.goto(
    '/plots?source=experiment&project=demo-project-1&experiment=demo-experiment-1'
  );
  await page.getByLabel('X axis', { exact: true }).click();
  await page
    .getByRole('option', { name: 'Plasma pulse', exact: false })
    .first()
    .click();
  await page.getByLabel('Y axis', { exact: true }).click();
  await page
    .getByRole('option', { name: 'Temperature', exact: false })
    .first()
    .click();
  await page.getByLabel('Colour by', { exact: true }).click();
  await page.getByRole('option', { name: 'Study' }).click();

  // The demo samples are in two named studies (and some in none).
  const legend = page.getByRole('list', { name: 'Legend' });
  await expect(legend).toContainText('Plasma pulse study');
  // Only three studies keep their own colour; the others are folded into Other.
  await expect(legend).toContainText('No study');

  // Tick two rows in the samples table: the Plot button opens just those.
  await page.goto('/projects/demo-project-1/experiments/demo-experiment-1');
  await page.getByRole('checkbox', { name: 'Select ALD001' }).click();
  await page.getByRole('checkbox', { name: 'Select ALD002' }).click();
  await page.getByRole('link', { name: 'Plot', exact: true }).click();

  await expect(page.getByText('Showing 2 selected samples')).toBeVisible();
  const table = page.getByRole('main').getByRole('table');
  await expect(table.getByText('ALD001')).toBeVisible();
  await expect(table.getByText('ALD002')).toBeVisible();
  await expect(table.getByText('ALD003', { exact: true })).toHaveCount(0);

  // Back to every sample.
  await page.getByRole('link', { name: 'Show all samples' }).click();
  await expect(page.getByText('Showing 2 selected samples')).toHaveCount(0);
});

test('filters to one number of cycles, colours by cycles and unticks a point', async ({
  page
}) => {
  await page.goto(
    '/plots?source=experiment&project=demo-project-1&experiment=demo-experiment-1'
  );

  // Y starts on a result, not a setting.
  await expect(page.getByLabel('Y axis', { exact: true })).toContainText(
    'Thickness'
  );
  await page.getByLabel('X axis', { exact: true }).click();
  await page.getByRole('option', { name: 'Temperature' }).click();

  // Colour by the number of cycles: 600 and 800 are two groups.
  await page.getByLabel('Colour by', { exact: true }).click();
  await page.getByRole('option', { name: 'Cycles' }).click();
  const legend = page.getByRole('list', { name: 'Legend' });
  await expect(legend).toContainText('800');

  // Keep only 600 cycles.
  await page.getByLabel('Add a filter').click();
  await page.getByRole('option', { name: 'Cycles' }).click();
  await page.getByRole('checkbox', { name: '600' }).click();
  const summary = page.getByText(/\d+ samples? plotted/);
  await expect(summary).toContainText('8 samples plotted');
  await expect(summary).toContainText('15 left out by filters');
  await expect(page.getByRole('row', { name: /ALD007/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /ALD015/ })).toHaveCount(0);

  // Take one point off the plot; it stays in the list and can be ticked back.
  await page.getByRole('checkbox', { name: 'Plot ALD007' }).click();
  await expect(summary).toContainText('7 samples plotted');
  await expect(summary).toContainText('1 unticked');
  await page.getByRole('checkbox', { name: 'Plot ALD007' }).click();
  await expect(summary).toContainText('8 samples plotted');
});

test('exports the plot as a picture, a PDF, a PowerPoint slide and its numbers', async ({
  page
}) => {
  await page.goto('/plots');
  await page.getByLabel('Table file').setInputFiles({
    name: 'fake.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(TABLE)
  });
  await expect(page.locator('.recharts-scatter-symbol')).toHaveCount(3);

  const files: Record<string, string> = {
    'Picture (PNG)': '.png',
    PDF: '.pdf',
    PowerPoint: '.pptx',
    'Excel table': '.xlsx',
    'CSV table': '.csv'
  };
  for (const [item, extension] of Object.entries(files)) {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('menuitem', { name: item }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(
      `thickness-nm-vs-power-w${extension}`
    );
  }
});

test('saves a plot with a title, opens it again with its filters, and deletes it', async ({
  page
}) => {
  await page.goto(
    '/plots?source=experiment&project=demo-project-1&experiment=demo-experiment-1'
  );
  await page.getByLabel('Add a filter').click();
  await page.getByRole('option', { name: 'Cycles' }).click();
  await page.getByRole('checkbox', { name: '800' }).click();
  await expect(page.getByText(/\d+ samples? plotted/)).toContainText(
    '8 samples plotted'
  );
  await page.getByRole('checkbox', { name: 'Plot ALD015' }).click();

  // A title is required.
  await page.getByRole('button', { name: 'Save plot', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByText('Give the plot a title.')).toBeVisible();

  await dialog.getByLabel('Title', { exact: true }).fill('Only 800 cycles');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Plot Only 800 cycles saved')).toBeVisible();

  // It opens as a saved plot, with the filter and the unticked sample kept.
  await expect(page).toHaveURL(/plot=/);
  await expect(
    page.getByRole('link', { name: 'Open Only 800 cycles' })
  ).toBeVisible();
  await expect(page.getByText(/\d+ samples? plotted/)).toContainText(
    '7 samples plotted'
  );
  await expect(page.getByText(/\d+ samples? plotted/)).toContainText(
    '1 unticked'
  );
  await page.reload();
  await expect(page.getByText(/\d+ samples? plotted/)).toContainText(
    '7 samples plotted'
  );

  // The same title cannot be used twice.
  await page.getByRole('button', { name: 'Save as new' }).click();
  await dialog.getByLabel('Title', { exact: true }).fill('only 800 CYCLES');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByText(/has this title/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  // Delete removes only the plot.
  await page.getByRole('button', { name: 'Delete Only 800 cycles' }).click();
  // It asks first; cancelling keeps the plot.
  await expect(page.getByText('Delete this saved plot?')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(
    page.getByRole('link', { name: 'Open Only 800 cycles' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete Only 800 cycles' }).click();
  await page.getByRole('button', { name: 'Delete plot', exact: true }).click();
  await expect(page.getByText('Plot Only 800 cycles deleted')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open Only 800 cycles' })
  ).toHaveCount(0);
});

test('customises the plot: axis range, titles, and what an export says', async ({
  page
}) => {
  // Unique, so a plot left behind by an earlier failed run never clashes.
  const saved = `Styled ${Date.now().toString().slice(-6)}`;
  await page.goto(
    '/plots?source=experiment&project=demo-project-1&experiment=demo-experiment-1'
  );
  await page.getByLabel('X axis', { exact: true }).click();
  await page.getByRole('option', { name: 'Temperature' }).click();

  await page.getByText('Customise', { exact: true }).click();
  await page.getByLabel('Y minimum').fill('0');
  await page.getByLabel('Y maximum').fill('100');
  await page.getByLabel('Plot title').fill('Growth vs temperature');
  await page.getByLabel('Y axis title').fill('Thickness / nm');
  await page.getByLabel('Text size').click();
  await page.getByRole('option', { name: 'Large' }).click();

  // A larger marker size draws larger markers.
  const marker = page.locator('.recharts-scatter-symbol').first();
  const before = (await marker.boundingBox())?.width ?? 0;
  await page.getByLabel('Marker size').click();
  await page.getByRole('option', { name: 'Large' }).click();
  await expect
    .poll(async () => (await marker.boundingBox())?.width ?? 0)
    .toBeGreaterThan(before);

  // The typed range is the axis: it runs from 0 to 100.
  const ticks = page.locator('.recharts-cartesian-axis-tick-value');
  await expect(ticks.filter({ hasText: /^0$/ })).toHaveCount(1);
  await expect(ticks.filter({ hasText: /^100$/ })).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Growth vs temperature' })
  ).toBeVisible();
  await expect(page.getByText('Thickness / nm')).toBeVisible();

  // Saved with a plot, and given back when it is opened.
  await page.getByRole('button', { name: 'Save plot', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(saved);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(page.getByText(`Plot ${saved} saved`)).toBeVisible();
  await expect(page).toHaveURL(/plot=/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Growth vs temperature' })
  ).toBeVisible();
  await page.getByRole('button', { name: `Delete ${saved}` }).click();
  await page.getByRole('button', { name: 'Delete plot', exact: true }).click();
  await expect(page.getByText(`Plot ${saved} deleted`)).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('fits the screen: no sideways scrolling, chart and controls usable', async ({
    page
  }) => {
    await page.goto(
      '/plots?source=experiment&project=demo-project-1&experiment=demo-experiment-1'
    );
    await expect(
      page.locator('.recharts-scatter-symbol').first()
    ).toBeVisible();
    await page.getByLabel('Add a filter').click();
    await page.getByRole('option', { name: 'Cycles' }).click();
    await page.getByText('Customise', { exact: true }).click();
    await page.getByRole('button', { name: 'Export' }).scrollIntoViewIfNeeded();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const chart = await page.getByRole('img').first().boundingBox();
    expect(chart?.width).toBeGreaterThan(300);
  });
});
