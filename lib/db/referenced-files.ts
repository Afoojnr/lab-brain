import { datasets, references } from './schema';
import { getDb } from './client';

/**
 * Every storage path the records point at: attached files, and the stored PDF
 * and text of references.
 */
export const listReferencedFiles = async (): Promise<string[]> => {
  const db = await getDb();
  const [attached, kept] = await Promise.all([
    db.select({ path: datasets.storagePath }).from(datasets),
    db
      .select({ file: references.filePath, text: references.textPath })
      .from(references)
  ]);
  const paths = new Set<string>(attached.map(row => row.path));
  for (const row of kept) {
    paths.add(row.text);
    if (row.file) paths.add(row.file);
  }

  return [...paths].sort();
};
