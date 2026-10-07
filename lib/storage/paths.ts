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

type DatasetPathParts = {
  projectName: string;
  experimentPrefix: string;
  sampleCode: string;
  technique: string;
  /** `YYYY-MM-DD`, or null when the measurement has no date. */
  measuredOn: string | null;
  fileName: string;
};

/**
 * Where a characterization's file is stored: one folder per project,
 * experiment, sample and technique, with the date in the file name rather than
 * a folder, e.g. `Alpha/ALD/ALD001/EDX/2026-09-14_spectrum.txt`.
 */
export const datasetPath = (parts: DatasetPathParts): string =>
  [
    safeSegment(parts.projectName),
    safeSegment(parts.experimentPrefix),
    safeSegment(parts.sampleCode),
    safeSegment(parts.technique),
    `${parts.measuredOn ?? 'undated'}_${safeSegment(parts.fileName)}`
  ].join('/');

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
