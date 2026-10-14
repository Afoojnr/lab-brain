import { jsPDF } from 'jspdf';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const files = vi.hoisted(() => new Map<string, Uint8Array>());
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/experiments/server', () => ({
  getProjectById: vi.fn()
}));
vi.mock('@/lib/storage', () => ({
  getStorage: () => ({
    upload: async (path: string, bytes: Uint8Array) => {
      files.set(path, bytes);
    },
    download: async (path: string) => files.get(path) ?? null,
    list: async () => [...files.keys()],
    delete: async (path: string) => files.delete(path)
  })
}));
vi.mock('../net/safe-fetch', async importOriginal => ({
  ...(await importOriginal<typeof import('../net/safe-fetch')>()),
  safeFetch: vi.fn()
}));

import { revalidatePath } from 'next/cache';

import { getProjectById } from '@/features/experiments/server';

import { listReferencesByProject } from '../data/references';
import { LinkRefusal, safeFetch } from '../net/safe-fetch';
import { addReferenceAction } from './add-reference';
import { deleteReferenceAction } from './delete-reference';
import { updateReferenceAction } from './update-reference';

const PROJECT = 'demo-project-1';
const TEXT =
  'The plasma pulse changes the growth per cycle of boron carbide films grown by ALD.';

const form = (fields: Record<string, string | File>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);

  return data;
};
const pdfBytes = (pages: string[], title?: string) => {
  const document = new jsPDF();
  if (title) document.setProperties({ title, author: 'Ada Lovelace' });
  pages.forEach((page, index) => {
    if (index > 0) document.addPage();
    document.text(page, 10, 20);
  });

  return new Uint8Array(document.output('arraybuffer'));
};
const pdfFile = (name: string, bytes: Uint8Array) =>
  new File([bytes as BlobPart], name, { type: 'application/pdf' });
const stored = (path: string) =>
  new TextDecoder().decode(files.get(path) ?? new Uint8Array());

beforeEach(async () => {
  vi.clearAllMocks();
  files.clear();
  vi.mocked(getProjectById).mockResolvedValue({ id: PROJECT } as never);
  // The database is shared by the tests of this file, so every test starts from an empty project.
  for (const reference of await listReferencesByProject(PROJECT)) {
    await deleteReferenceAction(PROJECT, reference.id);
  }
  vi.mocked(revalidatePath).mockClear();
});

describe('addReferenceAction: pasted text', () => {
  it('keeps the text once in storage and records the reference', async () => {
    const result = await addReferenceAction(
      PROJECT,
      form({
        kind: 'text',
        title: ' My notes ',
        authors: 'A. Author',
        year: '2024',
        note: 'Shows the pulse effect',
        text: TEXT
      })
    );

    expect(result.ok).toBe(true);
    const [reference] = await listReferencesByProject(PROJECT);
    expect(reference).toMatchObject({
      kind: 'text',
      title: 'My notes',
      authors: 'A. Author',
      year: 2024,
      note: 'Shows the pulse effect',
      summary: null,
      filePath: null
    });
    expect(stored(reference.textPath)).toBe(TEXT);
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT}`);
  });

  it('refuses text too short to be worth keeping, and a project that does not exist', async () => {
    expect(
      await addReferenceAction(PROJECT, form({ kind: 'text', text: 'hi' }))
    ).toEqual({ ok: false, error: 'noText' });

    vi.mocked(getProjectById).mockResolvedValue(undefined);
    expect(
      await addReferenceAction(PROJECT, form({ kind: 'text', text: TEXT }))
    ).toEqual({ ok: false, error: 'invalid' });
  });

  it('refuses a bad year, a missing kind and garbage', async () => {
    expect(
      await addReferenceAction(
        PROJECT,
        form({ kind: 'text', text: TEXT, year: '24' })
      )
    ).toEqual({ ok: false, error: 'invalid' });
    expect(await addReferenceAction(PROJECT, form({ text: TEXT }))).toEqual({
      ok: false,
      error: 'invalid'
    });
  });
});

describe('addReferenceAction: PDF', () => {
  it('reads the pages once, marks them, keeps the original and takes the title from the file', async () => {
    const result = await addReferenceAction(
      PROJECT,
      form({
        kind: 'pdf',
        file: pdfFile(
          'paper.pdf',
          pdfBytes(
            [
              'Plasma pulse changes the growth per cycle in boron carbide films.',
              'Results: growth per cycle rises with temperature in this range.'
            ],
            'Growth of BxC'
          )
        )
      })
    );

    expect(result.ok).toBe(true);
    const [reference] = await listReferencesByProject(PROJECT);
    expect(reference).toMatchObject({
      kind: 'pdf',
      title: 'Growth of BxC',
      authors: 'Ada Lovelace',
      pageCount: 2
    });
    expect(stored(reference.textPath)).toContain('[Page 2]');
    expect(files.get(reference.filePath as string)).toBeDefined();
  });

  it('uses the file name when the PDF has no title, and keeps a title typed by the user', async () => {
    await addReferenceAction(
      PROJECT,
      form({
        kind: 'pdf',
        file: pdfFile(
          'smith-2020.pdf',
          pdfBytes([
            'Some text about atomic layer deposition of boron carbide.'
          ])
        )
      })
    );
    await addReferenceAction(
      PROJECT,
      form({
        kind: 'pdf',
        title: 'My title',
        file: pdfFile(
          'x.pdf',
          pdfBytes([
            'Some text about atomic layer deposition of boron carbide.'
          ])
        )
      })
    );

    expect((await listReferencesByProject(PROJECT)).map(r => r.title)).toEqual([
      'smith-2020',
      'My title'
    ]);
  });

  it('refuses a file that is not a PDF, an empty field, and one over 20 MB', async () => {
    expect(
      await addReferenceAction(
        PROJECT,
        form({ kind: 'pdf', file: new File(['hello'], 'a.pdf') })
      )
    ).toEqual({ ok: false, error: 'notPdf' });
    expect(await addReferenceAction(PROJECT, form({ kind: 'pdf' }))).toEqual({
      ok: false,
      error: 'fileMissing'
    });
    expect(
      await addReferenceAction(
        PROJECT,
        form({
          kind: 'pdf',
          file: new File([new Uint8Array(21 * 1024 * 1024)], 'big.pdf')
        })
      )
    ).toEqual({ ok: false, error: 'fileTooLarge' });
    expect(await listReferencesByProject(PROJECT)).toEqual([]);
  });
});

describe('addReferenceAction: link', () => {
  const html = `<html><head><title>Boron carbide ALD</title></head><body><article>
    <p>${'The growth per cycle depends on the plasma pulse and the temperature. '.repeat(6)}</p>
    <p>${'Thickness was measured by ellipsometry on silicon wafers. '.repeat(6)}</p></article></body></html>`;

  it('reads a web page once and keeps its text and address', async () => {
    vi.mocked(safeFetch).mockResolvedValueOnce({
      url: 'https://example.com/a',
      contentType: 'text/html; charset=utf-8',
      bytes: new TextEncoder().encode(html)
    });

    const result = await addReferenceAction(
      PROJECT,
      form({ kind: 'link', url: 'https://example.com/a' })
    );

    expect(result.ok).toBe(true);
    const [reference] = await listReferencesByProject(PROJECT);
    expect(reference).toMatchObject({
      kind: 'link',
      title: 'Boron carbide ALD',
      url: 'https://example.com/a',
      filePath: null
    });
    expect(stored(reference.textPath)).toContain('ellipsometry');
  });

  it('keeps the PDF when the link points at one', async () => {
    vi.mocked(safeFetch).mockResolvedValueOnce({
      url: 'https://example.com/p.pdf',
      contentType: 'application/pdf',
      bytes: pdfBytes(['Plasma pulse changes the growth per cycle in films.'])
    });

    await addReferenceAction(
      PROJECT,
      form({ kind: 'link', url: 'https://example.com/p.pdf' })
    );

    const [reference] = await listReferencesByProject(PROJECT);
    expect(reference.filePath).not.toBeNull();
    expect(reference.pageCount).toBe(1);
  });

  it('turns a DOI into its address', async () => {
    vi.mocked(safeFetch).mockResolvedValueOnce({
      url: 'https://doi.org/10.1000/xyz',
      contentType: 'text/html',
      bytes: new TextEncoder().encode(html)
    });

    await addReferenceAction(
      PROJECT,
      form({ kind: 'link', url: '10.1000/xyz' })
    );

    expect(safeFetch).toHaveBeenCalledWith(
      'https://doi.org/10.1000/xyz',
      expect.anything()
    );
  });

  it.each([
    ['invalid', 'linkInvalid'],
    ['blocked', 'linkBlocked'],
    ['tooLarge', 'linkTooLarge'],
    ['timeout', 'linkFailed'],
    ['failed', 'linkFailed']
  ] as const)(
    'reports a link that cannot be read (%s)',
    async (reason, error) => {
      vi.mocked(safeFetch).mockRejectedValueOnce(new LinkRefusal(reason));

      expect(
        await addReferenceAction(
          PROJECT,
          form({ kind: 'link', url: 'https://example.com/a' })
        )
      ).toEqual({ ok: false, error });
      expect(await listReferencesByProject(PROJECT)).toEqual([]);
    }
  );

  it('refuses an address that is not http, https or a DOI without fetching anything', async () => {
    expect(
      await addReferenceAction(
        PROJECT,
        form({ kind: 'link', url: 'file:///etc/passwd' })
      )
    ).toEqual({ ok: false, error: 'linkInvalid' });
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it('refuses a page type it cannot read', async () => {
    vi.mocked(safeFetch).mockResolvedValueOnce({
      url: 'https://example.com/a.zip',
      contentType: 'application/zip',
      bytes: new Uint8Array([1, 2, 3])
    });

    expect(
      await addReferenceAction(
        PROJECT,
        form({ kind: 'link', url: 'https://example.com/a.zip' })
      )
    ).toEqual({ ok: false, error: 'linkUnsupported' });
  });
});

describe('addReferenceAction: limit', () => {
  it('refuses the eleventh reference of a project', async () => {
    for (let index = 0; index < 10; index += 1) {
      expect(
        (await addReferenceAction(PROJECT, form({ kind: 'text', text: TEXT })))
          .ok
      ).toBe(true);
    }

    expect(
      await addReferenceAction(PROJECT, form({ kind: 'text', text: TEXT }))
    ).toEqual({ ok: false, error: 'limitReached' });
  });
});

describe('updateReferenceAction', () => {
  const values = {
    title: ' Better title ',
    authors: '',
    year: '2023',
    url: 'doi:10.1000/xyz',
    note: 'Why it matters',
    summary: 'Key points.'
  };

  it('saves the details and the summary, turning a DOI into a link', async () => {
    await addReferenceAction(PROJECT, form({ kind: 'text', text: TEXT }));
    const [reference] = await listReferencesByProject(PROJECT);

    expect(await updateReferenceAction(PROJECT, reference.id, values)).toBe(
      true
    );

    expect((await listReferencesByProject(PROJECT))[0]).toMatchObject({
      title: 'Better title',
      authors: null,
      year: 2023,
      url: 'https://doi.org/10.1000/xyz',
      note: 'Why it matters',
      summary: 'Key points.'
    });
  });

  it('ignores an empty title, a bad link, an unknown reference and another project', async () => {
    await addReferenceAction(PROJECT, form({ kind: 'text', text: TEXT }));
    const [reference] = await listReferencesByProject(PROJECT);

    expect(
      await updateReferenceAction(PROJECT, reference.id, {
        ...values,
        title: ' '
      })
    ).toBe(false);
    expect(
      await updateReferenceAction(PROJECT, reference.id, {
        ...values,
        url: 'javascript:alert(1)'
      })
    ).toBe(false);
    expect(await updateReferenceAction(PROJECT, 'ghost', values)).toBe(false);
    expect(await updateReferenceAction('other', reference.id, values)).toBe(
      false
    );
  });
});

describe('deleteReferenceAction', () => {
  it('removes the record and both stored files', async () => {
    await addReferenceAction(
      PROJECT,
      form({
        kind: 'pdf',
        file: pdfFile(
          'a.pdf',
          pdfBytes([
            'Some text about atomic layer deposition of boron carbide.'
          ])
        )
      })
    );
    const [reference] = await listReferencesByProject(PROJECT);
    expect(files.size).toBe(2);

    expect(await deleteReferenceAction(PROJECT, reference.id)).toBe(true);

    expect(files.size).toBe(0);
    expect(await listReferencesByProject(PROJECT)).toEqual([]);
  });

  it('does nothing for an unknown reference or another project', async () => {
    await addReferenceAction(PROJECT, form({ kind: 'text', text: TEXT }));
    const [reference] = await listReferencesByProject(PROJECT);

    expect(await deleteReferenceAction(PROJECT, 'ghost')).toBe(false);
    expect(await deleteReferenceAction('other', reference.id)).toBe(false);
    expect(await listReferencesByProject(PROJECT)).toHaveLength(1);
  });
});
