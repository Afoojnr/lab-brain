/**
 * Makes one part of a path safe and readable: no slashes, no `..`, no control
 * characters, no leading dots, never empty.
 */
export const safeSegment = (text: string): string => {
  const cleaned = text
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .trim();

  return cleaned === '' ? '_' : cleaned.slice(0, 100);
};

type LocationParts = {
  projectName: string;
  experimentPrefix: string;
  sampleCode: string;
  technique: string;
  /** `YYYY-MM-DD`, or null when the measurement has no date. */
  measuredOn: string | null;
};

type DatasetPathParts = LocationParts & {
  fileName: string;
  /** For a file from an uploaded folder: the folder's name. */
  folder?: string | null;
  /** For a file from an uploaded folder: its path inside it, e.g. `export/spot 1/quantification.csv`. */
  relativePath?: string | null;
};

const MAX_FOLDER_DEPTH = 12;

/** The technique's folder: `Alpha/ALD/ALD001/EDX`. */
export const techniqueDir = (parts: LocationParts): string =>
  [
    safeSegment(parts.projectName),
    safeSegment(parts.experimentPrefix),
    safeSegment(parts.sampleCode),
    safeSegment(parts.technique)
  ].join('/');

const dated = (parts: LocationParts, name: string) =>
  `${parts.measuredOn ?? 'undated'}_${safeSegment(name)}`;

/**
 * The parts of a path inside an uploaded folder, each made safe, or null when
 * the path is empty or nested deeper than {@link MAX_FOLDER_DEPTH}.
 */
export const safeSubPath = (relativePath: string): string[] | null => {
  const segments = relativePath.split('/').filter(segment => segment !== '');
  if (segments.length === 0 || segments.length > MAX_FOLDER_DEPTH) return null;

  return segments.map(safeSegment);
};

/**
 * Where a characterization's file is stored: one folder per project,
 * experiment, sample and technique, with the date in the file name rather than
 * a folder, e.g. `Alpha/ALD/ALD001/EDX/2026-09-14_spectrum.txt`.
 */
export const datasetPath = (parts: DatasetPathParts): string => {
  if (!parts.folder) {
    return `${techniqueDir(parts)}/${dated(parts, parts.fileName)}`;
  }

  // A file from an uploaded folder keeps its place in it:
  // `Alpha/ALD/ALD001/EDX/2026-09-14_ABC130/export/spot 1/quantification.csv`.
  const inside = safeSubPath(parts.relativePath ?? parts.fileName) ?? [
    safeSegment(parts.fileName)
  ];

  return [techniqueDir(parts), dated(parts, parts.folder), ...inside].join('/');
};

/**
 * A name for an uploaded folder that no earlier upload used: the same name, or
 * with `-2`, `-3`, ... so two uploads of one folder never mix their files.
 *
 * @param parts - The technique and date the folder is uploaded to.
 * @param folder - The folder's name.
 * @param taken - Paths already in storage.
 */
export const freeFolderName = (
  parts: LocationParts,
  folder: string,
  taken: string[]
): string => {
  const isTaken = (name: string) =>
    taken.some(path =>
      path.startsWith(`${techniqueDir(parts)}/${dated(parts, name)}/`)
    );
  if (!isTaken(folder)) return folder;

  for (let count = 2; ; count += 1) {
    if (!isTaken(`${folder}-${count}`)) return `${folder}-${count}`;
  }
};

/**
 * The same path, or with `-2`, `-3`, ... before the extension when a file is
 * already stored there, so a second upload never replaces the first.
 *
 * @param wanted - The path from {@link datasetPath}.
 * @param taken - Paths already in storage.
 */
export const withoutCollision = (wanted: string, taken: string[]): string => {
  if (!taken.includes(wanted)) return wanted;

  const dot = wanted.lastIndexOf('.');
  const slash = wanted.lastIndexOf('/');
  const hasExtension = dot > slash + 1;
  const stem = hasExtension ? wanted.slice(0, dot) : wanted;
  const extension = hasExtension ? wanted.slice(dot) : '';

  for (let count = 2; ; count += 1) {
    const candidate = `${stem}-${count}${extension}`;
    if (!taken.includes(candidate)) return candidate;
  }
};
