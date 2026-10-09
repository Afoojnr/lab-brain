import type { PickedFile } from '@/components/read-dropped-entries';

import type { TextFile } from '../techniques/edx/from-files';

/**
 * Reads the dropped files that an analysis needs as text, in the browser:
 * nothing is sent anywhere.
 *
 * @param picked - Everything that was dropped or chosen.
 * @param isNeeded - Whether a file name is one the analysis reads.
 */
export const readTextFiles = (
  picked: PickedFile[],
  isNeeded: (fileName: string) => boolean
): Promise<TextFile[]> =>
  Promise.all(
    picked
      .filter(({ file }) => isNeeded(file.name))
      .map(async ({ file, path }) => ({ path, text: await file.text() }))
  );

/** The files the EDX analysis reads. */
export const isEdxFile = (fileName: string): boolean =>
  ['quantification.csv', 'spectrum.emsa'].includes(fileName.toLowerCase());

/** The files the ellipsometry analysis reads: fit exports are CSV. */
export const isCsvFile = (fileName: string): boolean =>
  fileName.toLowerCase().endsWith('.csv');
