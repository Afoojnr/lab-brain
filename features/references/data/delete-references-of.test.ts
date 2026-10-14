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
    await add('demo-project-1', 'a', true);
    await add('demo-project-1', 'b', false);
    await add('demo-project-2', 'c', true);

    expect(await deleteReferencesOf('demo-project-1')).toBe(2);

    expect(await listReferencesByProject('demo-project-1')).toEqual([]);
    expect(await listReferencesByProject('demo-project-2')).toHaveLength(1);
    expect([...files].sort()).toEqual([
      'references/demo-project-2/c/original.pdf',
      'references/demo-project-2/c/text.txt'
    ]);
    expect(await deleteReferencesOf('demo-project-1')).toBe(0);
  });
});
