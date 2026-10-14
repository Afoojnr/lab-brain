import { describe, expect, it, vi } from 'vitest';

const downloaded = vi.hoisted(() => [] as { name: string; type: string }[]);
vi.mock('@/lib/download-file', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/download-file')>()),
  downloadBytes: (name: string, _bytes: Uint8Array, type: string) => {
    downloaded.push({ name, type });
  }
}));

import { exportTableFile } from './table-file';

const TABLE = {
  headers: ['ID', 'Value'],
  rows: [
    ['a', 1],
    ['b', null]
  ]
};

describe('exportTableFile', () => {
  it('downloads Excel and CSV files named after the title', async () => {
    await exportTableFile('xlsx', 'FTIR spectra', TABLE);
    await exportTableFile('csv', 'FTIR spectra', TABLE);

    expect(downloaded.map(file => file.name)).toEqual([
      'ftir-spectra.xlsx',
      'ftir-spectra.csv'
    ]);
    expect(downloaded[0].type).toContain('spreadsheetml');
    expect(downloaded[1].type).toContain('text/csv');
  });
});
