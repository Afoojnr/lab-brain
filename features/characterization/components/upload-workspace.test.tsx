import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

// Charts need a real layout; the tests are about the numbers and the table.
vi.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    Bar: Passthrough,
    BarChart: Passthrough,
    CartesianGrid: Passthrough,
    Cell: Passthrough,
    ErrorBar: Passthrough,
    Legend: Passthrough,
    Line: Passthrough,
    LineChart: Passthrough,
    ResponsiveContainer: Passthrough,
    Tooltip: Passthrough,
    XAxis: Passthrough,
    YAxis: Passthrough
  };
});
vi.mock('../upload/download-file', () => ({
  downloadBytes: vi.fn(),
  XLSX_TYPE: 'xlsx'
}));

import { downloadBytes } from '../upload/download-file';
import { UploadEdx } from './upload-edx';
import { UploadEllipsometry } from './upload-ellipsometry';

const t = en.analysis.workspace.upload;

// Fake numbers, in the layout the instruments export.
const quantification = (b: number, n: number) =>
  `Atomic number,Element symbol,Element name,Atomic concentration percentage,Weight concentration percentage,Energy level\n5,B,Boron,${b},0.1,10000\n7,N,Nitrogen,${n},0.1,10000\n`;
const SEQFIT = `Phase No.,Phase Desc,SubLay No.,Site No.,X,Y,Z,d(nm),d 2s(nm),n,k,R2,RMSE,Date&Time,Measurement
1,Dispersionlaws,0,,0,0,9.0,10.0,0.5,1.5,0,0.8,2.4,'2026/01/01 10:00:00',FAKE001_pt1
,,,,,,,,,,,,,,
,,,,,,,d(nm),d 2s(nm),n,k,,,,
Average,,,,,,,11.0,0.6,1.6,0,,,,
StdDeviation,,,,,,,1.0,0.07,0.1,0,,,,
`;

/** A file as a folder drop gives it: its name, and its path inside the dropped folder. */
const fileAt = (path: string, text: string) => {
  const file = new File([text], path.split('/').pop() ?? path);
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
};

const renderUi = (ui: React.ReactElement) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
  return userEvent.setup();
};

beforeEach(() => vi.clearAllMocks());

describe('UploadEdx', () => {
  const SAMPLE = [
    fileAt('ABC130/export/s1/quantification.csv', quantification(0.5, 0.3)),
    fileAt('ABC130/export/s2/quantification.csv', quantification(0.4, 0.3)),
    fileAt('ABC130/export/s3/quantification.csv', quantification(0.6, 0.3))
  ];
  const drop = (user: ReturnType<typeof userEvent.setup>, files: File[]) =>
    user.upload(screen.getByLabelText(t.folderInputLabel), files);

  it('shows a dropped sample folder as one row with the averaged ratio', async () => {
    const user = renderUi(<UploadEdx />);

    await drop(user, SAMPLE);

    const row = await screen.findByRole('row', { name: /ABC130/ });
    expect(within(row).getByText('1.66667')).toBeVisible(); // 50 / 30
    expect(within(row).getByText('3 of 3 spots')).toBeVisible();
  });

  it('recomputes when a spot is unticked, without deleting anything', async () => {
    const user = renderUi(<UploadEdx />);
    await drop(user, SAMPLE);

    await user.click(
      await screen.findByRole('button', { name: 'Show the spots of ABC130' })
    );
    await user.click(screen.getByRole('checkbox', { name: 'Include s2' }));

    const row = screen.getByRole('row', { name: /ABC130/ });
    expect(within(row).getByText('1.83333')).toBeVisible(); // 55 / 30
    expect(within(row).getByText('2 of 3 spots')).toBeVisible();
  });

  it('reads a date folder as several samples', async () => {
    const user = renderUi(<UploadEdx />);

    await drop(user, [
      fileAt(
        '2026-05-22/ABC130/export/s1/quantification.csv',
        quantification(0.5, 0.3)
      ),
      fileAt(
        '2026-05-22/ABC131/export/s1/quantification.csv',
        quantification(0.4, 0.3)
      )
    ]);

    expect(await screen.findByRole('row', { name: /ABC130/ })).toBeVisible();
    expect(screen.getByRole('row', { name: /ABC131/ })).toBeVisible();
  });

  it('lets the user say the dropped folder holds several samples', async () => {
    const user = renderUi(<UploadEdx />);
    await drop(user, [
      fileAt(
        'Batch/ABC1/export/s1/quantification.csv',
        quantification(0.5, 0.3)
      ),
      fileAt(
        'Batch/ABC2/export/s1/quantification.csv',
        quantification(0.4, 0.3)
      )
    ]);
    expect(await screen.findByRole('row', { name: /Batch/ })).toBeVisible();

    await user.click(screen.getByRole('button', { name: t.levelDate }));

    expect(screen.getByRole('row', { name: /ABC1/ })).toBeVisible();
    expect(screen.getByRole('row', { name: /ABC2/ })).toBeVisible();
  });

  it('lists a file it cannot read instead of skipping it', async () => {
    const user = renderUi(<UploadEdx />);

    await drop(user, [
      ...SAMPLE,
      fileAt('ABC130/export/bad/quantification.csv', 'a,b\n1,2')
    ]);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ABC130/export/bad/quantification.csv'
    );
  });

  it('says so when no quantification file was dropped', async () => {
    const user = renderUi(<UploadEdx />);

    await drop(user, [fileAt('ABC130/notes.txt', 'hello')]);

    // The drop zone only passes the files it reads on, so nothing was found.
    expect(await screen.findByText(t.noFiles)).toBeVisible();
  });

  it('downloads the summary as Excel and can start over', async () => {
    const user = renderUi(<UploadEdx />);
    await drop(user, SAMPLE);

    await user.click(await screen.findByRole('button', { name: t.download }));
    expect(downloadBytes).toHaveBeenCalledWith(
      'EDS_summary.xlsx',
      expect.any(Uint8Array),
      'xlsx'
    );

    await user.click(screen.getByRole('button', { name: t.startOver }));
    expect(screen.getByLabelText(t.folderInputLabel)).toBeInTheDocument();
  });
});

describe('UploadEllipsometry', () => {
  const drop = (user: ReturnType<typeof userEvent.setup>, files: File[]) =>
    user.upload(screen.getByLabelText(t.fileInputLabel), files);

  it('shows each fit export as a row with its thickness and n, named after the file', async () => {
    const user = renderUi(<UploadEllipsometry />);

    await drop(user, [new File([SEQFIT], 'FAKE001_seqfit.csv')]);

    const row = await screen.findByRole('row', { name: /FAKE001/ });
    expect(within(row).getByText('11')).toBeVisible();
    expect(within(row).getByText('1.6')).toBeVisible();
  });

  it('reports a CSV that is not a fit export', async () => {
    const user = renderUi(<UploadEllipsometry />);

    await drop(user, [new File(['a,b\n1,2'], 'notes.csv')]);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('notes.csv')
    );
  });

  it('downloads the summary as Excel', async () => {
    const user = renderUi(<UploadEllipsometry />);
    await drop(user, [new File([SEQFIT], 'FAKE001_seqfit.csv')]);

    await user.click(await screen.findByRole('button', { name: t.download }));

    expect(downloadBytes).toHaveBeenCalledWith(
      'Ellipsometry_summary.xlsx',
      expect.any(Uint8Array),
      'xlsx'
    );
  });
});
