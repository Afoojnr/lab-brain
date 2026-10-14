// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const files = vi.hoisted(() => new Set<string>());
vi.mock('@/lib/storage', () => ({
  getStorage: () => ({
    delete: async (path: string) => files.delete(path)
  })
}));

import { createReference, listReferencesByProject } from './references';
import { deleteReferencesOf } from '../server';

const add = async (projectId: string, id: string, hasPdf: boolean) => {
  const textPath = `references/${projectId}/${id}/text.txt`;
  const filePath = hasPdf ? `references/${projectId}/${id}/original.pdf` : null;
  files.add(textPath);
  if (filePath) files.add(filePath);

  return createReference({
    id,
    createdAt: new Date(),
    projectId,
    kind: hasPdf ? 'pdf' : 'text',
    title: id,
    authors: null,
    year: null,
    url: null,
    note: null,
    summary: null,
    filePath,
    textPath,
    pageCount: null,
    characters: 10,
    isTruncated: false
  });
};

describe('deleteReferencesOf', () => {
  it("removes a project's references with their files from storage, and no other project's", async () => {
    await add('gone', 'a', true);
    await add('gone', 'b', false);
    await add('kept', 'c', true);

    expect(await deleteReferencesOf('gone')).toBe(2);

    expect(await listReferencesByProject('gone')).toEqual([]);
    expect(await listReferencesByProject('kept')).toHaveLength(1);
    expect([...files].sort()).toEqual([
      'references/kept/c/original.pdf',
      'references/kept/c/text.txt'
    ]);
    expect(await deleteReferencesOf('gone')).toBe(0);
  });
});
