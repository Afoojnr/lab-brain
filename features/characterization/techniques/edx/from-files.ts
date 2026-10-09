import { parseEmsa, parseQuantification } from './parse';
import type { Spot } from './types';

/** A file that was read as text, with its path inside the folder it was dropped in. */
export type TextFile = { path: string; text: string };

/** One sample's EDX measurements from dropped files: its spots, and the files that could not be read. */
export type EdxItem = {
  /** The sample folder's name, e.g. `ABC130`. */
  id: string;
  spots: Spot[];
  problems: { file: string; reason: string }[];
};

const isHidden = (segment: string) => segment.startsWith('.');

/**
 * Whether a folder is named like a date (`2026-05-22`, `20260522`): the lab
 * keeps a day's sample folders inside one, so the samples are one level down.
 *
 * @param name - The dropped folder's name.
 */
export const looksLikeDateFolder = (name: string): boolean =>
  /^\d{4}-\d{2}-\d{2}/.test(name) || /^\d{8}$/.test(name);

const directoryOf = (segments: string[]) => segments.slice(0, -1).join('/');

/**
 * Groups dropped files into samples the way the lab notebook does: a
 * `quantification.csv` is one spot, with its `spectrum.emsa` beside it, and a
 * sample is the folder holding its spots. With `level` 0 the sample is the
 * folder that was dropped; with `level` 1 the dropped folder is a day's folder
 * and each folder inside it is a sample. A file that cannot be read is
 * reported, never skipped silently.
 *
 * @param files - The `quantification.csv` and `spectrum.emsa` files, as text.
 * @param level - How many folders to go down to reach a sample folder.
 */
export const groupEdxItems = (files: TextFile[], level: 0 | 1): EdxItem[] => {
  const usable = files
    .map(file => ({ ...file, segments: file.path.split('/').filter(Boolean) }))
    .filter(
      file => file.segments.length >= level + 2 && !file.segments.some(isHidden)
    );
  const spectra = new Map(
    usable
      .filter(file => file.segments.at(-1)?.toLowerCase() === 'spectrum.emsa')
      .map(file => [directoryOf(file.segments), file.text])
  );
  const items = new Map<string, EdxItem>();

  for (const file of usable) {
    if (file.segments.at(-1)?.toLowerCase() !== 'quantification.csv') continue;

    const itemId = file.segments[level] ?? '';
    const item = items.get(itemId) ?? { id: itemId, spots: [], problems: [] };
    items.set(itemId, item);

    const parsed = parseQuantification(file.text);
    if (!parsed.isOk) {
      item.problems.push({ file: file.path, reason: parsed.reason });
      continue;
    }

    // The spot's place inside its sample folder; a spot folder dropped alone is its own sample.
    const spotId = file.segments.slice(level + 1, -1).join('/');
    const spectrumText = spectra.get(directoryOf(file.segments));
    item.spots.push({
      id: spotId === '' ? itemId : spotId,
      label: spotId === '' ? itemId : (spotId.split('/').pop() ?? spotId),
      atomic: parsed.atomic,
      spectrum: spectrumText === undefined ? null : parseEmsa(spectrumText)
    });
  }

  return [...items.values()]
    .map(item => ({
      ...item,
      spots: item.spots.sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true })
      )
    }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
};
