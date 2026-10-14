import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/export/figure-file', () => ({ exportFigureFile: vi.fn() }));
vi.mock('@/lib/export/table-file', () => ({ exportTableFile: vi.fn() }));

import { exportFigureFile } from '@/lib/export/figure-file';
import { exportTableFile } from '@/lib/export/table-file';

import { exportFtir } from './export-ftir';
import type { FtirExportInput } from './export-ftir';

const INPUT: FtirExportInput = {
  chartElement: document.createElement('div'),
  title: 'ABC001 · FTIR',
  lines: ['Transmittance (%)'],
  legend: [{ label: 'a.csv', color: '#2563eb' }],
  table: { headers: ['ID', '1100 cm⁻¹'], rows: [['a.csv', 40]] }
};

beforeEach(() => vi.clearAllMocks());

describe('exportFtir', () => {
  it('sends the chart, its caption and legend to the figure formats at normal text size', async () => {
    for (const format of ['png', 'pdf', 'pptx'] as const) {
      await exportFtir(format, INPUT);
    }

    expect(exportFigureFile).toHaveBeenCalledTimes(3);
    expect(exportFigureFile).toHaveBeenLastCalledWith(
      'pptx',
      expect.objectContaining({
        title: 'ABC001 · FTIR',
        lines: ['Transmittance (%)'],
        legend: INPUT.legend,
        textScale: 1
      })
    );
    expect(exportTableFile).not.toHaveBeenCalled();
  });

  it('sends the values at the peaks, not the picture, to the table formats', async () => {
    await exportFtir('xlsx', INPUT);
    await exportFtir('csv', INPUT);

    expect(exportTableFile).toHaveBeenNthCalledWith(
      1,
      'xlsx',
      'ABC001 · FTIR',
      INPUT.table
    );
    expect(exportTableFile).toHaveBeenNthCalledWith(
      2,
      'csv',
      'ABC001 · FTIR',
      INPUT.table
    );
    expect(exportFigureFile).not.toHaveBeenCalled();
  });
});
